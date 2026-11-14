import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { audit } from '../lib/audit.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { prisma } from '../lib/db.js';
import { HEARTBEAT_SECONDS, ONLINE_WINDOW_MS, endpointLimitFor } from '../lib/devices.js';
import { httpError } from '../lib/errors.js';
import { ARCHES, DESKTOP_PLATFORMS, archFromSlug, archToSlug, platformFromSlug, platformToSlug } from '../lib/platform.js';
import { compareSemver, newest } from '../lib/semver.js';
import { rateLimitKey, requirePermission, requirePermissionOrKey } from '../plugins/authenticate.js';
import { authenticateDevice } from '../plugins/authenticateDevice.js';

const limit = (max: number, perCredential = false) => ({
  rateLimit: { max, timeWindow: '1 minute', ...(perCredential ? { keyGenerator: rateLimitKey } : {}) },
});
const semver = z.string().trim().regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/, 'Expected a version like 1.4.0.');
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PENDING_TOKENS = 25;

export default async function deviceRoutes(app: FastifyInstance) {
  // ── for people: manage the organisation's devices ──

  // A one-time code that lets one new agent join. The code is shown once and works for 24 hours.
  app.post('/devices/enrol-tokens', { preHandler: requirePermission('devices:manage'), config: limit(10) }, async (req, reply) => {
    const { productSlug } = z.object({ productSlug: z.string().min(1).max(100) }).parse(req.body);
    const user = req.auth!.user;
    const orgId = user.orgId!; // devices:manage is only held by organisation roles

    const product = await prisma.product.findFirst({ where: { slug: productSlug, isActive: true } });
    if (!product) throw httpError(404, 'NOT_FOUND', 'Product not found.');
    if ((await endpointLimitFor(prisma, orgId, product.id)) === 'none') {
      throw httpError(409, 'NOT_ENTITLED', 'Your organisation does not have an active plan for this product.');
    }
    const pending = await prisma.enrolmentToken.count({ where: { orgId, usedAt: null, expiresAt: { gt: new Date() } } });
    if (pending >= MAX_PENDING_TOKENS) throw httpError(409, 'TOO_MANY_TOKENS', 'Too many unused enrolment codes. Wait for them to expire or use them first.');

    const token = `spe_${randomToken(24)}`;
    const row = await prisma.enrolmentToken.create({
      data: { orgId, productId: product.id, createdById: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });
    await audit(req, { action: 'devices.enrol_token_created', actorId: user.id, orgId, targetType: 'enrolment_token', targetId: row.id, meta: { product: product.slug } });
    return reply.code(201).send({ token, expiresAt: row.expiresAt, product: product.slug });
  });

  app.get('/devices', { preHandler: requirePermissionOrKey('devices:read'), config: limit(120, true) }, async (req) => {
    const orgId = req.auth!.user.orgId!;
    const now = Date.now();
    const devices = await prisma.device.findMany({
      where: { orgId },
      include: { product: { select: { slug: true, name: true } } },
      orderBy: [{ status: 'asc' }, { lastSeenAt: 'desc' }],
      take: 500,
    });

    const entitled = await prisma.entitlement.findMany({
      where: { orgId, status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { product: { select: { id: true, slug: true, name: true } } },
    });
    const seen = new Map(entitled.map((e) => [e.product.id, e.product]));
    const usage = await Promise.all(
      [...seen.values()].map(async (p) => {
        const [active, max] = await Promise.all([prisma.device.count({ where: { orgId, productId: p.id, status: 'ACTIVE' } }), endpointLimitFor(prisma, orgId, p.id)]);
        return { product: { slug: p.slug, name: p.name }, active, limit: max === 'none' ? 0 : max };
      }),
    );

    return {
      usage,
      devices: devices.map((d) => ({
        id: d.id,
        product: d.product,
        hostname: d.hostname,
        platform: platformToSlug(d.platform),
        arch: archToSlug(d.arch),
        agentVersion: d.agentVersion,
        status: d.status.toLowerCase(),
        online: d.status === 'ACTIVE' && d.lastSeenAt !== null && now - d.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
        lastSeenAt: d.lastSeenAt,
        enrolledAt: d.createdAt,
      })),
    };
  });

  // Removing a device frees its place straight away; the agent is refused on its next call.
  app.delete<{ Params: { id: string } }>('/devices/:id', { preHandler: requirePermission('devices:manage'), config: limit(30) }, async (req, reply) => {
    const user = req.auth!.user;
    const r = await prisma.device.updateMany({ where: { id: req.params.id, orgId: user.orgId!, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date() } });
    if (r.count !== 1) throw httpError(404, 'NOT_FOUND', 'Device not found.');
    await audit(req, { action: 'devices.revoked', actorId: user.id, orgId: user.orgId, targetType: 'device', targetId: req.params.id });
    return reply.code(204).send();
  });

  // ── for agents ──

  // An agent trades its one-time code for its own long-lived credential.
  app.post('/agent/enrol', { config: limit(20) }, async (req, reply) => {
    const body = z
      .object({
        token: z.string().min(20).max(200),
        hostname: z.string().trim().min(1).max(253).refine((h) => !/[\u0000-\u001f\u007f]/.test(h), 'Invalid hostname.'),
        platform: z.enum(DESKTOP_PLATFORMS),
        arch: z.enum(ARCHES),
        agentVersion: semver,
      })
      .parse(req.body);

    const tok = await prisma.enrolmentToken.findUnique({ where: { tokenHash: sha256(body.token) } });
    if (!tok || tok.usedAt || tok.expiresAt < new Date()) throw httpError(400, 'INVALID_TOKEN', 'This enrolment code is invalid, already used, or has expired. Create a new one.');

    const now = new Date();
    const { device, secret } = await prisma.$transaction(async (tx) => {
      // One enrolment at a time per organisation and product, so the device limit cannot be beaten by racing.
      await tx.$queryRaw`WITH lock AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${`${tok.orgId}:${tok.productId}`}))) SELECT 1::int AS locked FROM lock`;
      const claimed = await tx.enrolmentToken.updateMany({ where: { id: tok.id, usedAt: null }, data: { usedAt: now } });
      if (claimed.count !== 1) throw httpError(400, 'INVALID_TOKEN', 'This enrolment code is invalid, already used, or has expired. Create a new one.');

      const max = await endpointLimitFor(tx, tok.orgId, tok.productId);
      if (max === 'none') throw httpError(403, 'NOT_ENTITLED', 'The organisation does not have an active plan for this product.');
      const active = await tx.device.count({ where: { orgId: tok.orgId, productId: tok.productId, status: 'ACTIVE' } });
      // Throwing here rolls the claim back too, so the code can be used again after a device is removed.
      if (max !== null && active >= max) throw httpError(409, 'ENDPOINT_LIMIT_REACHED', `Your plan allows ${max} device${max === 1 ? '' : 's'} and all of them are in use. Remove one, or add more devices to your plan.`);

      const secret = randomToken(32);
      const device = await tx.device.create({
        data: {
          orgId: tok.orgId,
          productId: tok.productId,
          platform: platformFromSlug(body.platform),
          arch: archFromSlug(body.arch),
          hostname: body.hostname,
          agentVersion: body.agentVersion,
          secretHash: sha256(secret),
          lastSeenAt: now,
        },
      });
      return { device, secret };
    });
    await audit(req, { action: 'devices.enrolled', orgId: tok.orgId, targetType: 'device', targetId: device.id, meta: { hostname: body.hostname, platform: body.platform, arch: body.arch } });
    return reply.code(201).send({ deviceId: device.id, credential: `${device.id}.${secret}`, heartbeatIntervalSeconds: HEARTBEAT_SECONDS });
  });

  // The agent's regular check-in: proves it is alive, and learns whether it is still allowed and up to date.
  app.post('/agent/heartbeat', { preHandler: authenticateDevice, config: limit(30, true) }, async (req) => {
    const body = z.object({ agentVersion: semver, hostname: z.string().trim().min(1).max(253).optional() }).parse(req.body);
    const device = req.device!;

    await prisma.device.update({ where: { id: device.id }, data: { lastSeenAt: new Date(), agentVersion: body.agentVersion, ...(body.hostname ? { hostname: body.hostname } : {}) } });

    // If the organisation no longer has an active plan, the agent stays enrolled but should stop working and check back rarely.
    if ((await endpointLimitFor(prisma, device.orgId, device.productId)) === 'none') {
      return { status: 'suspended', reason: 'no_active_plan', intervalSeconds: 3600, updateAvailable: false, updateRequired: false };
    }
    const releases = await prisma.version.findMany({ where: { productId: device.productId, publishedAt: { not: null } }, select: { version: true, minSupported: true } });
    const latest = newest(releases.map((r) => r.version));
    const minimum = newest(releases.filter((r) => r.minSupported).map((r) => r.version));
    return {
      status: 'ok',
      intervalSeconds: HEARTBEAT_SECONDS,
      latestVersion: latest,
      minSupportedVersion: minimum,
      updateAvailable: latest !== null && compareSemver(body.agentVersion, latest) < 0,
      // An agent older than the minimum must update before doing anything else.
      updateRequired: minimum !== null && compareSemver(body.agentVersion, minimum) < 0,
    };
  });
}
