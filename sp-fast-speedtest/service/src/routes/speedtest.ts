import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  checkUsage,
  recordUsage,
  checkDailyTransferCap,
  recordTransfer,
  saveResult,
} from "../lib/usage.js";
import { generateReport, REPORTS_DIR } from "../lib/report.js";
import { gradeSpeed } from "../lib/scoring.js";

// Per-call caps — these bound a single download/upload request. The
// frontend runs a small, fixed number of calls per test (not user-
// configurable), so these caps are what actually determine the real
// per-scan payload budget (~10MB down x2, ~5MB up x2 ≈ 30MB/scan, as scoped).
const MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Cached random payload for download tests — generated once at startup
// rather than per-request, since it's not sensitive data and regenerating
// multi-MB of randomness on every call would be wasted CPU on a shared
// droplet.
const DOWNLOAD_PAYLOAD = crypto.randomBytes(MAX_DOWNLOAD_BYTES);

type Session = { usageId: string; ipAddress: string; expiresAt: number };
const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 3 * 60 * 1000; // 3 minutes — enough for download+upload+ping

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (s.expiresAt < now) sessions.delete(token);
  }
}
setInterval(cleanupExpiredSessions, 60 * 1000).unref();

function getClientIp(req: { headers: Record<string, unknown>; ip: string }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip;
}

export default async function speedtestRoute(app: FastifyInstance) {
  // --- Start a test session: gates on the 3-use limit, issues a token ---
  app.post<{ Body: { fingerprint?: string } }>("/start", async (req, reply) => {
    const ipAddress = getClientIp(req);
    const fingerprint = req.body?.fingerprint;

    if (!fingerprint || typeof fingerprint !== "string") {
      return reply.code(400).send({ error: "fingerprint is required." });
    }

    const usage = await checkUsage(fingerprint, ipAddress);
    if (!usage.allowed) {
      return reply.code(402).send({
        error: "limit_reached",
        message: "Free speed test limit reached. Upgrade to SP Fast Enterprise for unlimited, multi-region testing.",
      });
    }

    const usageId = await recordUsage(fingerprint, ipAddress);
    const token = crypto.randomUUID();
    sessions.set(token, { usageId, ipAddress, expiresAt: Date.now() + SESSION_TTL_MS });

    return reply.send({ token, usesRemaining: usage.usesRemaining - 1 });
  });

  // --- Download test: server → client timed transfer ---
  app.get<{ Querystring: { token?: string; bytes?: string } }>("/download", async (req, reply) => {
    const { token, bytes } = req.query;
    const ipAddress = getClientIp(req);

    const session = token ? sessions.get(token) : undefined;
    if (!session || session.ipAddress !== ipAddress || session.expiresAt < Date.now()) {
      return reply.code(401).send({ error: "Invalid or expired test session. Start a new test." });
    }

    const requested = Math.min(Number(bytes) || MAX_DOWNLOAD_BYTES, MAX_DOWNLOAD_BYTES);

    const cap = await checkDailyTransferCap(ipAddress, requested);
    if (!cap.allowed) {
      return reply.code(429).send({ error: "Daily bandwidth limit reached for this network. Try again tomorrow." });
    }

    await recordTransfer(ipAddress, requested);

    reply.header("Content-Type", "application/octet-stream");
    reply.header("Cache-Control", "no-store");
    return reply.send(DOWNLOAD_PAYLOAD.subarray(0, requested));
  });

  // --- Upload test: client → server timed transfer (client does the timing) ---
  app.post("/upload", async (req, reply) => {
    const { token } = req.query as { token?: string };
    const ipAddress = getClientIp(req);

    const session = token ? sessions.get(token) : undefined;
    if (!session || session.ipAddress !== ipAddress || session.expiresAt < Date.now()) {
      return reply.code(401).send({ error: "Invalid or expired test session. Start a new test." });
    }

    const contentLength = Number(req.headers["content-length"] ?? 0);
    if (contentLength > MAX_UPLOAD_BYTES) {
      return reply.code(413).send({ error: "Upload payload too large." });
    }

    const cap = await checkDailyTransferCap(ipAddress, contentLength);
    if (!cap.allowed) {
      return reply.code(429).send({ error: "Daily bandwidth limit reached for this network. Try again tomorrow." });
    }

    // Body is consumed by Fastify's default JSON/body parser already running
    // (req.body exists by the time the handler runs); we only need the byte
    // count for accounting, not the content itself.
    await recordTransfer(ipAddress, contentLength);

    return reply.send({ received: true, bytes: contentLength });
  });

  // --- Finish: client submits its own computed numbers, gets graded + PDF ---
  app.post<{
    Body: { token?: string; downloadMbps?: number; uploadMbps?: number; latencyMs?: number };
  }>("/submit", async (req, reply) => {
    const { token, downloadMbps, uploadMbps, latencyMs } = req.body ?? {};
    const ipAddress = getClientIp(req);

    const session = token ? sessions.get(token) : undefined;
    if (!session || session.ipAddress !== ipAddress || session.expiresAt < Date.now()) {
      return reply.code(401).send({ error: "Invalid or expired test session. Start a new test." });
    }
    if (
      typeof downloadMbps !== "number" ||
      typeof uploadMbps !== "number" ||
      typeof latencyMs !== "number" ||
      downloadMbps < 0 ||
      uploadMbps < 0 ||
      latencyMs < 0
    ) {
      return reply.code(400).send({ error: "downloadMbps, uploadMbps, and latencyMs must be non-negative numbers." });
    }

    // One-time use — a session can't be submitted twice.
    sessions.delete(token!);

    const result = await saveResult(session.usageId, downloadMbps, uploadMbps, latencyMs);
    const filename = await generateReport(result.id, downloadMbps, uploadMbps, latencyMs);

    const usage = await checkUsage("", ipAddress); // ipAddress-only lookup for remaining count display

    return reply.send({
      grade: gradeSpeed(downloadMbps),
      downloadMbps,
      uploadMbps,
      latencyMs,
      usesRemaining: usage.usesRemaining,
      reportUrl: `/api/speedtest/report/${filename}`,
    });
  });

  // --- Serve the generated PDF ---
  app.get<{ Params: { filename: string } }>("/report/:filename", async (req, reply) => {
    const { filename } = req.params;
    if (!/^[a-zA-Z0-9._-]+\.pdf$/.test(filename)) {
      return reply.code(400).send({ error: "Invalid filename." });
    }
    const filepath = path.join(REPORTS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return reply.code(404).send({ error: "Report not found." });
    }
    reply.header("Content-Type", "application/pdf");
    return reply.send(fs.createReadStream(filepath));
  });
}
