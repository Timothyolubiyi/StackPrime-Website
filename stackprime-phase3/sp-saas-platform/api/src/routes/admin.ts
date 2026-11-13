import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { audit } from '../lib/audit.js';
import { prisma } from '../lib/db.js';
import { httpError } from '../lib/errors.js';
import { ARCHES, DESKTOP_PLATFORMS, archFromSlug, platformFromSlug } from '../lib/platform.js';
import { requireStaff } from '../plugins/authenticate.js';

// StackPrime staff only. Every change is written to the audit log.
const semver = z.string().trim().regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/, 'Use a version like 1.4.0 or 1.4.0-rc.1.');
const limit = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });
const staff = (max = 60) => ({ preHandler: requireStaff, config: limit(max) });

const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

export default async function adminRoutes(app: FastifyInstance) {
  // Staff-only product and plan listing for pricing and access administration.
  app.get('/products', staff(60), async () => {
    const products = await prisma.product.findMany({
      include: {
        plans: {
          include: { prices: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      products: products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        isActive: product.isActive,
        plans: product.plans.map((plan) => ({
          id: plan.id,
          code: plan.code,
          name: plan.name,
          billingModel: plan.billingModel,
          interval: plan.interval,
          endpointLimit: plan.endpointLimit,
          isActive: plan.isActive,
          prices: plan.prices.map((price) => ({
            currency: price.currency,
            amountMinor: price.amountMinor,
            isActive: price.isActive,
            hasProviderPlan: price.providerPlanCode !== null,
          })),
        })),
      })),
    };
  });
  // ── product copy ──
  app.patch<{ Params: { slug: string } }>('/products/:slug', staff(30), async (req) => {
    const body = z
      .object({
        name: z.string().trim().min(2).max(100).optional(),
        tagline: z.string().trim().max(200).nullable().optional(),
        description: z.string().trim().min(1).max(5000).optional(),
        launchUrl: z.string().url().max(300).nullable().optional(),
        features: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(1000).optional(),
      })
      .refine((b) => Object.keys(b).length > 0, 'Nothing to update.')
      .parse(req.body);

    const existing = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!existing) throw httpError(404, 'NOT_FOUND', 'Product not found.');
    const { features, ...rest } = body;
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { ...rest, ...(features ? { features: { set: features } } : {}) },
    });
    await audit(req, { action: 'catalog.product_updated', actorId: req.auth!.user.id, targetType: 'product', targetId: product.id, meta: { changed: Object.keys(body) } });
    return { slug: product.slug, name: product.name, isActive: product.isActive };
  });

  // ── plans: name, endpoint limit, on/off. Prices are per currency: see adminBilling.ts ──
  app.patch<{ Params: { id: string } }>('/plans/:id', staff(30), async (req) => {
    const body = z
      .object({
        name: z.string().trim().min(2).max(100).optional(),
        endpointLimit: z.number().int().min(1).max(1_000_000).nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .refine((b) => Object.keys(b).length > 0, 'Nothing to update.')
      .parse(req.body);

    const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) throw httpError(404, 'NOT_FOUND', 'Plan not found.');
    const updated = await prisma.plan.update({ where: { id: plan.id }, data: body });
    await audit(req, { action: 'catalog.plan_updated', actorId: req.auth!.user.id, targetType: 'plan', targetId: plan.id, meta: { changed: Object.keys(body) } });
    return { id: updated.id, code: updated.code, name: updated.name, endpointLimit: updated.endpointLimit, isActive: updated.isActive };
  });

  // ── versions: create (draft) -> add artifacts -> publish (then immutable) ──
  app.post<{ Params: { slug: string } }>('/products/:slug/versions', staff(30), async (req, reply) => {
    const body = z.object({ version: semver, changelog: z.string().trim().max(10_000).optional(), minSupported: z.boolean().optional() }).parse(req.body);
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!product) throw httpError(404, 'NOT_FOUND', 'Product not found.');
    try {
      const v = await prisma.version.create({
        data: { productId: product.id, version: body.version, changelog: body.changelog, minSupported: body.minSupported ?? false },
      });
      await audit(req, { action: 'catalog.version_created', actorId: req.auth!.user.id, targetType: 'version', targetId: v.id, meta: { product: product.slug, version: v.version } });
      return reply.code(201).send({ id: v.id, version: v.version, published: false });
    } catch (err) {
      if (isUniqueViolation(err)) throw httpError(409, 'VERSION_EXISTS', 'That version already exists for this product.');
      throw err;
    }
  });

  app.post<{ Params: { id: string } }>('/versions/:id/artifacts', staff(60), async (req, reply) => {
    const body = z
      .object({
        platform: z.enum(DESKTOP_PLATFORMS), // android / ios are rejected: Phase 4
        arch: z.enum(ARCHES),
        filename: z.string().regex(/^[A-Za-z0-9._-]{1,200}$/, 'Use letters, numbers, dot, dash or underscore.'),
        storageKey: z.string().max(300).regex(/^[A-Za-z0-9._/-]+$/, 'Invalid storage key.').refine((k) => !k.includes('..') && !k.startsWith('/'), 'Invalid storage key.'),
        sha256: z.string().toLowerCase().regex(/^[a-f0-9]{64}$/, 'Expected a 64-character SHA-256 hex digest.'),
        sizeBytes: z.number().int().positive().max(10_000_000_000),
      })
      .parse(req.body);

    const version = await prisma.version.findUnique({ where: { id: req.params.id } });
    if (!version) throw httpError(404, 'NOT_FOUND', 'Version not found.');
    if (version.publishedAt) throw httpError(409, 'VERSION_PUBLISHED', 'Published versions cannot be changed. Create a new version instead.');
    try {
      const a = await prisma.artifact.create({
        data: {
          versionId: version.id,
          platform: platformFromSlug(body.platform),
          arch: archFromSlug(body.arch),
          filename: body.filename,
          storageKey: body.storageKey,
          sha256: body.sha256,
          sizeBytes: BigInt(body.sizeBytes),
        },
      });
      await audit(req, { action: 'catalog.artifact_added', actorId: req.auth!.user.id, targetType: 'artifact', targetId: a.id, meta: { version: version.version, platform: body.platform, arch: body.arch } });
      return reply.code(201).send({ id: a.id, platform: body.platform, arch: body.arch });
    } catch (err) {
      if (isUniqueViolation(err)) throw httpError(409, 'ARTIFACT_EXISTS', 'This version already has a file for that platform and architecture.');
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>('/artifacts/:id', staff(30), async (req, reply) => {
    const artifact = await prisma.artifact.findUnique({ where: { id: req.params.id }, include: { version: true } });
    if (!artifact) throw httpError(404, 'NOT_FOUND', 'Artifact not found.');
    if (artifact.version.publishedAt) throw httpError(409, 'VERSION_PUBLISHED', 'Published versions cannot be changed.');
    await prisma.artifact.delete({ where: { id: artifact.id } });
    await audit(req, { action: 'catalog.artifact_removed', actorId: req.auth!.user.id, targetType: 'artifact', targetId: artifact.id });
    return reply.code(204).send();
  });

  app.post<{ Params: { id: string } }>('/versions/:id/publish', staff(30), async (req) => {
    const version = await prisma.version.findUnique({ where: { id: req.params.id }, include: { _count: { select: { artifacts: true } } } });
    if (!version) throw httpError(404, 'NOT_FOUND', 'Version not found.');
    if (version.publishedAt) throw httpError(409, 'ALREADY_PUBLISHED', 'This version is already published.');
    if (version._count.artifacts === 0) throw httpError(409, 'NO_ARTIFACTS', 'Add at least one file before publishing.');

    const claimed = await prisma.version.updateMany({ where: { id: version.id, publishedAt: null }, data: { publishedAt: new Date() } });
    if (claimed.count !== 1) throw httpError(409, 'ALREADY_PUBLISHED', 'This version is already published.');
    await audit(req, { action: 'catalog.version_published', actorId: req.auth!.user.id, targetType: 'version', targetId: version.id, meta: { version: version.version } });
    return { id: version.id, version: version.version, published: true };
  });
}
