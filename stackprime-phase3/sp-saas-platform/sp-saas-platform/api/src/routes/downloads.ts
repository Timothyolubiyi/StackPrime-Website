import { createReadStream, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { audit } from '../lib/audit.js';
import { DOWNLOAD_TTL_SECONDS, createDownloadUrl, verifyDownloadToken } from '../lib/artifacts.js';
import { prisma } from '../lib/db.js';
import { activeEntitlementWhere, hasComplimentaryProductAccess, ownerOf } from '../lib/entitlements.js';
import { httpError } from '../lib/errors.js';
import { archToSlug, platformToSlug } from '../lib/platform.js';
import { requirePermission } from '../plugins/authenticate.js';

const limit = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });

export default async function downloadRoutes(app: FastifyInstance) {
  // What this account may download: the latest releases of every product it currently has access to.
  app.get('/downloads', { preHandler: requirePermission('downloads:create') }, async (req) => {
    const user = req.auth!.user;
    const now = new Date();
    const isPlatformOwner = hasComplimentaryProductAccess(user);

    const ents = isPlatformOwner
      ? []
      : await prisma.entitlement.findMany({
          where: { ...ownerOf(user), status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          select: { productId: true },
        });

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(isPlatformOwner ? {} : { id: { in: [...new Set(ents.map((e) => e.productId))] } }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { versions: { where: { publishedAt: { not: null } }, orderBy: { publishedAt: 'desc' }, take: 3, include: { artifacts: true } } },
    });
    return {
      products: products.map((p) => ({
        slug: p.slug,
        name: p.name,
        versions: p.versions.map((v) => ({
          version: v.version,
          changelog: v.changelog,
          publishedAt: v.publishedAt,
          files: v.artifacts
            .map((a) => ({ id: a.id, platform: platformToSlug(a.platform), arch: archToSlug(a.arch), filename: a.filename, sizeBytes: Number(a.sizeBytes), sha256: a.sha256 }))
            .sort((x, y) => x.platform.localeCompare(y.platform) || x.arch.localeCompare(y.arch)),
        })),
      })),
    };
  });

  // Ask for a short-lived link to one file. Entitlement is checked here, and every request is logged.
  app.post('/downloads', { preHandler: requirePermission('downloads:create'), config: limit(30) }, async (req) => {
    const { artifactId } = z.object({ artifactId: z.string().min(1).max(60) }).parse(req.body);
    const user = req.auth!.user;

    const artifact = await prisma.artifact.findUnique({ where: { id: artifactId }, include: { version: { include: { product: { select: { isActive: true } } } } } });
    // Unpublished and unknown files look identical, so drafts cannot be probed.
    if (!artifact || !artifact.version.publishedAt) throw httpError(404, 'NOT_FOUND', 'File not found.');

    const isPlatformOwner = hasComplimentaryProductAccess(user);

    if (isPlatformOwner && !artifact.version.product.isActive) {
      throw httpError(404, 'NOT_FOUND', 'File not found.');
    }

    const entitlement = isPlatformOwner
      ? null
      : await prisma.entitlement.findFirst({
          where: activeEntitlementWhere(user, artifact.version.productId),
          select: { id: true },
        });

    if (!isPlatformOwner && !entitlement) {
      throw httpError(403, 'NOT_ENTITLED', 'Your account does not have an active plan for this product.');
    }

    const url = await createDownloadUrl(artifact);
    await prisma.download.create({ data: { userId: user.id, orgId: user.orgId, artifactId: artifact.id, ip: req.ip } });
    await audit(req, {
      action: 'downloads.link_issued',
      actorId: user.id,
      orgId: user.orgId,
      targetType: 'artifact',
      targetId: artifact.id,
      meta: {
        version: artifact.version.version,
        accessMode: isPlatformOwner ? 'platform_owner_complimentary' : 'entitlement',
        ...(entitlement ? { entitlementId: entitlement.id } : {}),
      },
    });
    return { url, expiresInSeconds: DOWNLOAD_TTL_SECONDS, filename: artifact.filename, sizeBytes: Number(artifact.sizeBytes), sha256: artifact.sha256 };
  });

  // The link itself. The signed token is the authority, because a browser download cannot send a header.
  app.get<{ Params: { token: string } }>('/downloads/file/:token', { config: limit(60) }, async (req, reply) => {
    const verified = verifyDownloadToken(req.params.token);
    if (!verified) throw httpError(403, 'LINK_EXPIRED', 'This download link is invalid or has expired. Go back and start the download again.');
    const artifact = await prisma.artifact.findUnique({ where: { id: verified.artifactId } });
    if (!artifact) throw httpError(404, 'NOT_FOUND', 'File not found.');

    reply
      .header('Content-Type', 'application/octet-stream')
      .header('Content-Disposition', `attachment; filename="${artifact.filename}"`)
      .header('Cache-Control', 'private, no-store');

    if (config.NODE_ENV === 'development') {
      // Running the API directly (no nginx in front): stream from a local folder.
      const base = resolve(config.ARTIFACTS_DIR);
      const full = resolve(base, artifact.storageKey);
      if (!full.startsWith(base + sep) || !existsSync(full)) throw httpError(404, 'NOT_FOUND', 'File not found on this machine.');
      return reply.send(createReadStream(full));
    }
    // In production nginx serves the file itself: this header hands the request over to its internal-only location.
    reply.header('X-Accel-Redirect', `/_artifacts/${artifact.storageKey}`);
    return reply.code(200).send();
  });
}
