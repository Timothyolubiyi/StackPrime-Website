import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { httpError } from '../lib/errors.js';
import { config } from '../config.js';
import { prisma } from '../lib/db.js';
import { archToSlug, platformToSlug } from '../lib/platform.js';

// Public, read-only. What a visitor may see: names, copy, plans, prices and which platforms exist.
// Never exposed here: Stripe ids, storage keys, checksums (checksums come with an authorised download).
const publishedVersions = { publishedAt: { not: null } } satisfies Prisma.VersionWhereInput;

const productInclude = {
  plans: { where: { isActive: true }, include: { prices: { where: { isActive: true, provider: 'PAYSTACK' } } } },
  versions: {
    where: publishedVersions,
    orderBy: { publishedAt: 'desc' },
    include: { artifacts: true },
  },
} satisfies Prisma.ProductInclude;
type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type VersionRow = ProductRow['versions'][number];

const INTERVAL_ORDER = { MONTH: 0, YEAR: 1, ONE_TIME: 2 } as const;

const shapeVersion = (v: VersionRow) => ({
  version: v.version,
  changelog: v.changelog,
  publishedAt: v.publishedAt,
  platforms: v.artifacts
    .map((a) => ({
      platform: platformToSlug(a.platform),
      arch: archToSlug(a.arch),
      filename: a.filename,
      sizeBytes: Number(a.sizeBytes),
    }))
    .sort((a, b) => a.platform.localeCompare(b.platform) || a.arch.localeCompare(b.arch)),
});

function shapeProduct(p: ProductRow, withHistory: boolean) {
  const [latest, ...older] = p.versions;
  return {
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    launchUrl: p.launchUrl,
    features: p.features,
    plans: [...p.plans]
      .sort((a, b) => INTERVAL_ORDER[a.interval] - INTERVAL_ORDER[b.interval])
      .map((pl) => ({
        code: pl.code,
        name: pl.name,
        billingModel: pl.billingModel.toLowerCase(),
        interval: pl.interval.toLowerCase(),
        endpointLimit: pl.endpointLimit,
        priceMinor: pl.priceMinor,
        currency: pl.currency,
        prices: pl.prices.map((price) => ({
          currency: price.currency,
          amountMinor: price.amountMinor,
          interval: pl.interval.toLowerCase(),
        })),
        // Checkout is available only for an active Paystack price configured for this plan.
        purchasable: config.PAYSTACK_ENABLED && pl.prices.length > 0,
      })),
    latestVersion: latest ? shapeVersion(latest) : null,
    ...(withHistory ? { previousVersions: older.map(shapeVersion) } : {}),
  };
}

export default async function catalogRoutes(app: FastifyInstance) {
  app.get('/catalog', async (_req, reply) => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: productInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    reply.header('Cache-Control', 'public, max-age=60');
    return { products: products.map((p) => shapeProduct(p, false)) };
  });

  app.get<{ Params: { slug: string } }>('/catalog/:slug', async (req, reply) => {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, isActive: true },
      include: productInclude,
    });
    if (!product) throw httpError(404, 'NOT_FOUND', 'Product not found.');
    reply.header('Cache-Control', 'public, max-age=60');
    return shapeProduct(product, true);
  });
}
