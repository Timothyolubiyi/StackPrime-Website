import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { config } from '../src/config.js';
import { signDownloadToken } from '../src/lib/artifacts.js';
import { prisma } from '../src/lib/db.js';
import { redis } from '../src/lib/redis.js';
import { addMember, call as rawCall, createOrg, createUser, enableMfa, grant, seedRelease, type TestUser } from './helpers.js';

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
const call = (u: TestUser | null, m: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) => rawCall(app, u, m, url, payload);

async function setup() {
  const { owner, orgId } = await createOrg(app);
  const member = await createUser(app);
  await addMember(app, owner, member, ['STANDARD_USER']);
  const billing = await createUser(app);
  await addMember(app, owner, billing, ['BILLING_ADMIN']);
  const auditor = await createUser(app);
  await addMember(app, owner, auditor, ['AUDITOR']);
  const rel = await seedRelease({ versions: [{ version: '1.0.0' }, { version: '1.1.0' }] });
  return { owner, member, billing, auditor, orgId, rel, file: rel.releases['1.1.0']!.windows };
}

describe('Platform Owner complimentary downloads', () => {
  it('can list and download published software without a commercial entitlement', async () => {
    const owner = await createUser(app);

    await prisma.user.update({
      where: { email: owner.email },
      data: {
        isPlatformOwner: true,
        isStaff: false,
        staffRoles: [],
      },
    });

    await enableMfa(app, owner);

    const rel = await seedRelease();
    const artifact = rel.releases['1.0.0']!.windows;

    const listing = await call(owner, 'GET', '/v1/downloads');
    expect(listing.statusCode).toBe(200);

    const listedProduct = listing.json().products.find(
      (product: { slug: string }) => product.slug === rel.slug,
    );
    expect(listedProduct).toBeTruthy();

    const result = await call(owner, 'POST', '/v1/downloads', {
      artifactId: artifact.id,
    });

    expect(result.statusCode).toBe(200);
    expect(result.json()).toMatchObject({
      filename: 'agent-1.0.0.msi',
      expiresInSeconds: 300,
    });

    const userId = (
      await prisma.user.findUniqueOrThrow({
        where: { email: owner.email },
        select: { id: true },
      })
    ).id;

    expect(
      await prisma.entitlement.count({
        where: { userId, productId: rel.product.id },
      }),
    ).toBe(0);

    expect(
      await prisma.download.count({
        where: { userId, artifactId: artifact.id },
      }),
    ).toBe(1);
  });
});
describe('Platform Owner inactive product restrictions', () => {
  it('cannot list or download software from an inactive product', async () => {
    const owner = await createUser(app);

    await prisma.user.update({
      where: { email: owner.email },
      data: {
        isPlatformOwner: true,
        isStaff: false,
        staffRoles: [],
      },
    });

    await enableMfa(app, owner);

    const rel = await seedRelease();

    await prisma.product.update({
      where: { id: rel.product.id },
      data: { isActive: false },
    });

    const listing = await call(owner, 'GET', '/v1/downloads');
    expect(listing.statusCode).toBe(200);
    expect(
      listing.json().products.some(
        (product: { slug: string }) => product.slug === rel.slug,
      ),
    ).toBe(false);

    const result = await call(owner, 'POST', '/v1/downloads', {
      artifactId: rel.releases['1.0.0']!.windows.id,
    });

    expect(result.statusCode).toBe(404);
    expect(result.json().code).toBe('NOT_FOUND');

    const userId = (
      await prisma.user.findUniqueOrThrow({
        where: { email: owner.email },
        select: { id: true },
      })
    ).id;

    expect(
      await prisma.download.count({
        where: { userId, artifactId: rel.releases['1.0.0']!.windows.id },
      }),
    ).toBe(0);
  });
});
describe('listing downloads', () => {
  it('shows the latest releases with checksums, only for products the account has, and only to people who may download', async () => {
    const t = await setup();
    expect((await call(t.member, 'GET', '/v1/downloads')).json().products).toEqual([]); // no plan yet

    await grant({ orgId: t.orgId }, t.rel.product.id, t.rel.plan.id);
    // A draft must never appear.
    await prisma.version.create({ data: { productId: t.rel.product.id, version: '2.0.0-draft' } });

    const res = await call(t.member, 'GET', '/v1/downloads');
    expect(res.statusCode).toBe(200);
    const p = res.json().products.find((x: { slug: string }) => x.slug === t.rel.slug);
    expect(p.versions[0].version).toBe('1.1.0'); // newest first
    expect(p.versions[0].files).toHaveLength(2);
    expect(p.versions[0].files[0]).toMatchObject({ sha256: expect.stringMatching(/^[ab]{64}$/) });
    expect(res.body).not.toContain('2.0.0-draft');
    expect(res.body).not.toContain('storageKey');

    // Billing admins and auditors cannot download (scope section 4.2).
    expect((await call(t.billing, 'GET', '/v1/downloads')).statusCode).toBe(403);
    expect((await call(t.auditor, 'GET', '/v1/downloads')).statusCode).toBe(403);
    expect((await call(null, 'GET', '/v1/downloads')).statusCode).toBe(401);
  });
});

describe('requesting a download', () => {
  it('issues a five-minute link, logs it, and refuses everyone without a plan or permission', async () => {
    const t = await setup();
    await grant({ orgId: t.orgId }, t.rel.product.id, t.rel.plan.id);

    const ok = await call(t.member, 'POST', '/v1/downloads', { artifactId: t.file.id });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ expiresInSeconds: 300, filename: 'agent-1.1.0.msi', sizeBytes: 1000 });
    expect(ok.json().url).toContain('/v1/downloads/file/');
    const memberId = (await call(t.member, 'GET', '/v1/me')).json().id as string;
    expect(await prisma.download.count({ where: { userId: memberId, artifactId: t.file.id } })).toBe(1);

    expect((await call(t.billing, 'POST', '/v1/downloads', { artifactId: t.file.id })).statusCode).toBe(403);
    expect((await call(t.auditor, 'POST', '/v1/downloads', { artifactId: t.file.id })).statusCode).toBe(403);
    expect((await call(null, 'POST', '/v1/downloads', { artifactId: t.file.id })).statusCode).toBe(401);

    // Someone from another organisation, with no plan for this product.
    const { owner: stranger } = await createOrg(app, 'Other Org');
    const denied = await call(stranger, 'POST', '/v1/downloads', { artifactId: t.file.id });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().code).toBe('NOT_ENTITLED');
  });

  it('treats drafts and unknown files alike, and stops when the plan ends', async () => {
    const t = await setup();
    const ent = await grant({ orgId: t.orgId }, t.rel.product.id, t.rel.plan.id);

    const draft = await prisma.version.create({ data: { productId: t.rel.product.id, version: '3.0.0' } });
    const draftFile = await prisma.artifact.create({ data: { versionId: draft.id, platform: 'MACOS', arch: 'UNIVERSAL', filename: 'a.pkg', storageKey: 'x/a.pkg', sha256: 'c'.repeat(64), sizeBytes: BigInt(1) } });
    expect((await call(t.member, 'POST', '/v1/downloads', { artifactId: draftFile.id })).statusCode).toBe(404);
    expect((await call(t.member, 'POST', '/v1/downloads', { artifactId: 'nope' })).statusCode).toBe(404);

    await prisma.entitlement.update({ where: { id: ent.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await call(t.member, 'POST', '/v1/downloads', { artifactId: t.file.id })).json().code).toBe('NOT_ENTITLED');
  });
});

describe('the download link', () => {
  it('hands the file to nginx, and cannot be forged, tampered with, or used after it expires', async () => {
    const t = await setup();
    await grant({ orgId: t.orgId }, t.rel.product.id, t.rel.plan.id);
    const { url } = (await call(t.member, 'POST', '/v1/downloads', { artifactId: t.file.id })).json() as { url: string };
    const path = new URL(url).pathname;

    // No sign-in header: the signed token is the authority.
    const res = await call(null, 'GET', path);
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-accel-redirect']).toBe(`/_artifacts/${t.file.storageKey}`);
    expect(res.headers['content-disposition']).toContain('agent-1.1.0.msi');
    expect(res.headers['cache-control']).toContain('no-store');

    const bad = await call(null, 'GET', `${path.slice(0, -2)}xx`);
    expect(bad.statusCode).toBe(403);
    expect(bad.json().code).toBe('LINK_EXPIRED');
    expect((await call(null, 'GET', `/v1/downloads/file/${signDownloadToken(t.file.id, Date.now() - 1000)}`)).statusCode).toBe(403);
    expect((await call(null, 'GET', '/v1/downloads/file/garbage')).statusCode).toBe(403);
  });

  it('is a signed, expiring link straight to the bucket when Spaces is the store', async () => {
    const t = await setup();
    await grant({ orgId: t.orgId }, t.rel.product.id, t.rel.plan.id);
    const mutable = config as { ARTIFACT_STORE: string };
    mutable.ARTIFACT_STORE = 'spaces';
    try {
      const { url } = (await call(t.member, 'POST', '/v1/downloads', { artifactId: t.file.id })).json() as { url: string };
      expect(url).toContain('test-bucket');
      expect(url).toContain('X-Amz-Signature');
      expect(url).toContain('X-Amz-Expires=300');
    } finally {
      mutable.ARTIFACT_STORE = 'local';
    }
  });
});
