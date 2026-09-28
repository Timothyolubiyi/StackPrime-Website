import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAndValidateTarget } from "../lib/target.js";
import { checkUsage, recordUsage } from "../lib/usage.js";
import { checkTls } from "../lib/checks/tls.js";
import { checkHeaders } from "../lib/checks/headers.js";
import { checkDnsSecurity } from "../lib/checks/dns-security.js";
import { checkExposedPorts } from "../lib/checks/ports.js";
import { checkWellKnown } from "../lib/checks/well-known.js";
import { scoreFindings, type ScanFindings } from "../lib/scoring.js";
import { generateVasReportPdf } from "../lib/report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, "..", "..", "reports");

const prisma = new PrismaClient();

type ScanRequestBody = {
  target: string;
  fingerprint: string;
  consent: boolean;
};

export async function scanRoutes(app: FastifyInstance) {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

  app.post<{ Body: ScanRequestBody }>("/api/vas/scan", async (request, reply) => {
    const { target, fingerprint, consent } = request.body ?? ({} as ScanRequestBody);
    const ipAddress = request.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || request.ip;

    if (!target || !fingerprint) {
      return reply.code(400).send({ error: "target and fingerprint are required." });
    }
    if (!consent) {
      return reply.code(400).send({
        error: "You must confirm you are authorized to assess this target before scanning.",
      });
    }

    const usage = await checkUsage(prisma, fingerprint, ipAddress);
    if (!usage.allowed) {
      return reply.code(402).send({
        error: "limit_reached",
        message: "You've used all 3 free assessments. Upgrade to Premium for unlimited scans.",
        upgradeUrl: "https://stackprimeconsulting.com.ng/saas-products",
      });
    }

    const parsed = await parseAndValidateTarget(target);
    if ("error" in parsed) {
      return reply.code(400).send({ error: parsed.error });
    }

    const [tls, headers, dnsSecurity, ports, wellKnown] = await Promise.all([
      checkTls(parsed.hostname),
      checkHeaders(parsed.url),
      checkDnsSecurity(parsed.hostname),
      checkExposedPorts(parsed.hostname),
      checkWellKnown(parsed.url),
    ]);

    const findings: ScanFindings = { tls, headers, dnsSecurity, ports, wellKnown };
    const result = scoreFindings(findings);

    const reportFilename = `sp-vas-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
    const reportPath = path.join(REPORTS_DIR, reportFilename);
    await generateVasReportPdf({
      target: parsed.hostname,
      scannedAt: new Date(),
      findings,
      result,
      outputPath: reportPath,
    });

    await recordUsage(prisma, {
      fingerprint,
      ipAddress,
      target: parsed.hostname,
      riskGrade: result.grade,
      riskScore: result.score,
      reportPath: reportFilename,
    });

    const usesRemainingAfter = Math.max(0, usage.usesRemaining - 1);

    return reply.send({
      target: parsed.hostname,
      grade: result.grade,
      score: result.score,
      findings: result.findings,
      usesRemaining: usesRemainingAfter,
      reportUrl: `/api/vas/report/${reportFilename}`,
    });
  });

  app.get<{ Params: { filename: string } }>("/api/vas/report/:filename", async (request, reply) => {
    const { filename } = request.params;
    // Prevent path traversal — only serve exactly what's in the reports dir.
    if (!/^sp-vas-[\w-]+\.pdf$/.test(filename)) {
      return reply.code(400).send({ error: "Invalid report filename." });
    }
    const filePath = path.join(REPORTS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: "Report not found." });
    }
    reply.header("Content-Type", "application/pdf");
    reply.header("Content-Disposition", `inline; filename="${filename}"`);
    return reply.send(fs.createReadStream(filePath));
  });
}
