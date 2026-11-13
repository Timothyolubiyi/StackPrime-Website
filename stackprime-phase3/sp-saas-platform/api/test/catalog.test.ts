import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/db.js';
import { redis } from '../src/lib/redis.js';
import { createUser, enableMfa, type TestUser } from './helpers.js';

let app: FastifyInstance;
beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
});

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
const call = (user: TestUser | null, method: Method, url: string, payload?: object) =>
  app.inject({ method, url, payload, headers: user ? user.headers : {} });

const SHA = 'a'.repeat(64);
const rand = () => Math.random().toString(36).slice(2, 10); // letters and digits only

async function createStaff(withMfa = true): Promise<TestUser> {
  const u = await createUser(app);
  await prisma.user.update({ where: { email: u.email }, data: { isStaff: true } });
  if (withMfa) await enableMfa(app, u);
  return u;
}

/** A product with an active plan, a hidden plan carrying secrets, a published version and a draft. */
async function createProduct() {
  const slug = `t-${rand()}`;
  const hiddenStripeId = `PLN_hidden${rand()}`; // provider plan codes are unique, so every product needs its own
  const product = await prisma.product.create({
    data: {
      slug,
      name: 'Test Product',
      tagline: 'A tagline',
      description: 'Describes the test product.',
      features: ['Feature one', 'Feature two'],
      plans: {
        create: [
          { code: 'monthly', name: 'Monthly', billingModel: 'SUBSCRIPTION', interval: 'MONTH' },
          { code: 'old', name: 'Old plan', billingModel: 'SUBSCRIPTION', interval: 'YEAR', isActive: false },
        ],
      },
      versions: {
        create: [
          {
            version: '1.0.0',
            changelog: 'First release',
            publishedAt: new Date(),
            artifacts: {
              create: [
                { platform: 'WINDOWS', arch: 'X64', filename: 'app-1.0.0.msi', storageKey: 'secret/key/app-1.0.0.msi', sha256: SHA, sizeBytes: BigInt(1234) },
                { platform: 'LINUX_DEB', arch: 'ARM64', filename: 'app-1.0.0-arm64.deb', storageKey: 'secret/key/app.deb', sha256: SHA, sizeBytes: BigInt(999) },
              ],
            },
          },
          { version: '2.0.0-draft', changelog: 'Not released yet' },
        ],
      },
    },
  });
  const old = await prisma.plan.findFirstOrThrow({ where: { productId: product.id, code: 'old' } });
  await prisma.planPrice.create({ data: { planId: old.id, currency: 'USD', amountMinor: 1000, provider: 'PAYSTACK', providerPlanCode: hiddenStripeId } });
  return Object.assign(product, { hiddenStripeId });
}

describe('public catalog', () => {
  it('lists active products and plans, with no secrets, to anyone', async () => {
    const product = await createProduct();
    const res = await call(null, 'GET', '/v1/catalog');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toContain('public');

    const entry = res.json().products.find((p: { slug: string }) => p.slug === product.slug);
    expect(entry).toBeTruthy();
    expect(entry.features).toEqual(['Feature one', 'Feature two']);
    expect(entry.plans).toHaveLength(1); // the inactive plan is hidden
    expect(entry.plans[0].code).toBe('monthly');
    expect(entry.plans[0].prices).toEqual([]); // no price set yet
    expect(entry.latestVersion.version).toBe('1.0.0');
    expect(entry.latestVersion.platforms.map((p: { platform: string }) => p.platform).sort()).toEqual(['linux-deb', 'windows']);

    for (const secret of ['storageKey', 'secret/key', 'sha256', product.hiddenStripeId, 'providerPlanCode', '2.0.0-draft']) {
      expect(res.body, `must not expose ${secret}`).not.toContain(secret);
    }
  });

  it('shows one product by slug, and hides inactive or unknown ones', async () => {
    const product = await createProduct();
    const one = await call(null, 'GET', `/v1/catalog/${product.slug}`);
    expect(one.statusCode).toBe(200);
    expect(one.json().name).toBe('Test Product');
    expect(one.json().previousVersions).toEqual([]);
    expect(one.body).not.toContain('2.0.0-draft');

    expect((await call(null, 'GET', '/v1/catalog/does-not-exist')).statusCode).toBe(404);

    await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });
    expect((await call(null, 'GET', `/v1/catalog/${product.slug}`)).statusCode).toBe(404);
    const list = (await call(null, 'GET', '/v1/catalog')).json().products as { slug: string }[];
    expect(list.some((p) => p.slug === product.slug)).toBe(false);
  });
});

describe('catalog admin access', () => {
  it('is for staff with MFA only', async () => {
    const product = await createProduct();
    const url = `/v1/admin/products/${product.slug}/versions`;
    const body = { version: '1.1.0' };

    expect((await call(null, 'POST', url, body)).statusCode).toBe(401);
    expect((await call(await createUser(app), 'POST', url, body)).statusCode).toBe(403);

    const noMfa = await call(await createStaff(false), 'POST', url, body);
    expect(noMfa.statusCode).toBe(403);
    expect(noMfa.json().code).toBe('STAFF_MFA_REQUIRED');

    expect((await call(await createStaff(true), 'POST', url, body)).statusCode).toBe(201);
  });
});

describe('publishing a version', () => {
  it('goes draft -> files -> published, and is immutable afterwards', async () => {
    const product = await createProduct();
    const staff = await createStaff();
    const staffId = (await call(staff, 'GET', '/v1/me')).json().id as string;

    const created = await call(staff, 'POST', `/v1/admin/products/${product.slug}/versions`, { version: '1.5.0', changelog: 'Adds things' });
    expect(created.statusCode).toBe(201);
    const versionId = created.json().id as string;

    expect((await call(staff, 'POST', `/v1/admin/products/${product.slug}/versions`, { version: '1.5.0' })).json().code).toBe('VERSION_EXISTS');
    expect((await call(staff, 'POST', `/v1/admin/products/${product.slug}/versions`, { version: '1.5' })).statusCode).toBe(400);

    // Cannot publish an empty version.
    expect((await call(staff, 'POST', `/v1/admin/versions/${versionId}/publish`)).json().code).toBe('NO_ARTIFACTS');

    const good = { platform: 'windows', arch: 'x64', filename: 'app-1.5.0.msi', storageKey: 'p/app/1.5.0/app-1.5.0.msi', sha256: SHA, sizeBytes: 5000 };
    const artifactUrl = `/v1/admin/versions/${versionId}/artifacts`;
    // Phase 4 platforms and malformed input are rejected.
    expect((await call(staff, 'POST', artifactUrl, { ...good, platform: 'android' })).statusCode).toBe(400);
    expect((await call(staff, 'POST', artifactUrl, { ...good, platform: 'ios' })).statusCode).toBe(400);
    expect((await call(staff, 'POST', artifactUrl, { ...good, sha256: 'xyz' })).statusCode).toBe(400);
    expect((await call(staff, 'POST', artifactUrl, { ...good, storageKey: '../../etc/passwd' })).statusCode).toBe(400);

    const added = await call(staff, 'POST', artifactUrl, good);
    expect(added.statusCode).toBe(201);
    expect((await call(staff, 'POST', artifactUrl, good)).json().code).toBe('ARTIFACT_EXISTS');

    // Not visible to the public until published.
    expect((await call(null, 'GET', `/v1/catalog/${product.slug}`)).body).not.toContain('1.5.0');

    expect((await call(staff, 'POST', `/v1/admin/versions/${versionId}/publish`)).statusCode).toBe(200);
    expect((await call(staff, 'POST', `/v1/admin/versions/${versionId}/publish`)).json().code).toBe('ALREADY_PUBLISHED');

    // Immutable now.
    const late = await call(staff, 'POST', artifactUrl, { ...good, platform: 'macos', arch: 'universal', filename: 'app-1.5.0.pkg' });
    expect(late.statusCode).toBe(409);
    expect(late.json().code).toBe('VERSION_PUBLISHED');
    expect((await call(staff, 'DELETE', `/v1/admin/artifacts/${added.json().id}`)).statusCode).toBe(409);

    // Public now sees it as the newest version, with its platform but not its secrets.
    const pub = await call(null, 'GET', `/v1/catalog/${product.slug}`);
    expect(pub.json().latestVersion.version).toBe('1.5.0');
    expect(pub.json().previousVersions.map((v: { version: string }) => v.version)).toContain('1.0.0');
    expect(pub.body).not.toContain('p/app/1.5.0');

    const logged = await prisma.auditLog.findFirst({ where: { action: 'catalog.version_published', actorId: staffId } });
    expect(logged).not.toBeNull();
  });

  it('lets staff remove a file from a draft', async () => {
    const product = await createProduct();
    const staff = await createStaff();
    const v = await call(staff, 'POST', `/v1/admin/products/${product.slug}/versions`, { version: '3.0.0' });
    const a = await call(staff, 'POST', `/v1/admin/versions/${v.json().id}/artifacts`, {
      platform: 'container', arch: 'arm64', filename: 'img.tar', storageKey: 'p/img.tar', sha256: SHA, sizeBytes: 10,
    });
    expect((await call(staff, 'DELETE', `/v1/admin/artifacts/${a.json().id}`)).statusCode).toBe(204);
  });
});

describe('pricing and product copy', () => {
  it('prices plans per currency, and a subscription is purchasable only once it has a provider plan', async () => {
    const product = await createProduct();
    const staff = await createStaff();
    const plan = await prisma.plan.findFirstOrThrow({ where: { productId: product.id, code: 'monthly' } });
    const priceUrl = `/v1/admin/plans/${plan.id}/prices/NGN`;

    expect((await call(staff, 'PUT', priceUrl, { amountMinor: 0 })).statusCode).toBe(400);
    expect((await call(staff, 'PUT', `/v1/admin/plans/${plan.id}/prices/NAIRA`, { amountMinor: 100 })).statusCode).toBe(400);
    const set = await call(staff, 'PUT', priceUrl, { amountMinor: 2_500_000 });
    expect(set.statusCode).toBe(200);
    expect(set.json().purchasable).toBe(false); // a subscription with no provider plan yet

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: true, message: 'ok', data: { plan_code: `PLN_${rand()}` } }), { status: 200 })));
    try {
      const sync = await call(staff, 'POST', `${priceUrl}/paystack-plan`);
      expect(sync.statusCode).toBe(200);
      expect(sync.json().purchasable).toBe(true);
      expect((await call(staff, 'POST', `${priceUrl}/paystack-plan`)).json().code).toBe('ALREADY_SYNCED');
    } finally {
      vi.unstubAllGlobals();
    }

    const pub = await call(null, 'GET', `/v1/catalog/${product.slug}`);
    expect(pub.json().plans[0].prices[0]).toMatchObject({ currency: 'NGN', amountMinor: 2_500_000, purchasable: true });
    expect(pub.body).not.toContain('PLN_');

    // Changing the amount detaches the provider plan, so what we show and what Paystack charges never disagree.
    const changed = await call(staff, 'PUT', priceUrl, { amountMinor: 3_000_000 });
    expect(changed.json().purchasable).toBe(false);
  });

  it('lets staff edit product copy and hide a product', async () => {
    const product = await createProduct();
    const staff = await createStaff();
    const url = `/v1/admin/products/${product.slug}`;
    expect((await call(staff, 'PATCH', url, {})).statusCode).toBe(400);
    expect((await call(staff, 'PATCH', url, { tagline: 'New tagline', features: ['Only one'] })).statusCode).toBe(200);
    expect((await call(null, 'GET', `/v1/catalog/${product.slug}`)).json().features).toEqual(['Only one']);
    expect((await call(staff, 'PATCH', url, { isActive: false })).statusCode).toBe(200);
    expect((await call(null, 'GET', `/v1/catalog/${product.slug}`)).statusCode).toBe(404);
  });
});
