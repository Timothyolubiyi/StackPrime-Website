import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/db.js';
import { redis } from '../src/lib/redis.js';
import { addMember, call as rawCall, createOrg, createUser, grant, seedRelease, type TestUser } from './helpers.js';

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
const call = (u: TestUser | null, m: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object, headers?: Record<string, string>) => rawCall(app, u, m, url, payload, headers);

async function setup(limit: number | null = 5, versions?: { version: string; minSupported?: boolean }[]) {
  const { owner, orgId } = await createOrg(app);
  const it = await createUser(app);
  await addMember(app, owner, it, ['IT_ADMIN']);
  const standard = await createUser(app);
  await addMember(app, owner, standard, ['STANDARD_USER']);
  const auditor = await createUser(app);
  await addMember(app, owner, auditor, ['AUDITOR']);
  const rel = await seedRelease({ limit, versions });
  const ent = await grant({ orgId }, rel.product.id, rel.plan.id);
  return { owner, it, standard, auditor, orgId, rel, ent };
}

const newToken = async (u: TestUser, slug: string) => {
  const r = await call(u, 'POST', '/v1/devices/enrol-tokens', { productSlug: slug });
  expect(r.statusCode).toBe(201);
  return r.json().token as string;
};
const enrol = (token: string, extra: Record<string, unknown> = {}) =>
  call(null, 'POST', '/v1/agent/enrol', { token, hostname: 'pc-01', platform: 'windows', arch: 'x64', agentVersion: '1.0.0', ...extra });
const beat = (credential: string, body: Record<string, unknown> = { agentVersion: '1.0.0' }) =>
  call(null, 'POST', '/v1/agent/heartbeat', body, { authorization: `Device ${credential}` });

describe('enrolment codes', () => {
  it('can be created only by people who manage devices, for products the organisation has', async () => {
    const t = await setup();
    const res = await call(t.it, 'POST', '/v1/devices/enrol-tokens', { productSlug: t.rel.slug });
    expect(res.statusCode).toBe(201);
    expect(res.json().token).toMatch(/^spe_/);
    expect(await prisma.enrolmentToken.count({ where: { tokenHash: res.json().token } })).toBe(0); // only a hash is stored

    expect((await call(t.standard, 'POST', '/v1/devices/enrol-tokens', { productSlug: t.rel.slug })).statusCode).toBe(403);
    expect((await call(t.auditor, 'POST', '/v1/devices/enrol-tokens', { productSlug: t.rel.slug })).statusCode).toBe(403);
    expect((await call(await createUser(app), 'POST', '/v1/devices/enrol-tokens', { productSlug: t.rel.slug })).statusCode).toBe(403); // no organisation

    const other = await seedRelease(); // a product this organisation has no plan for
    expect((await call(t.owner, 'POST', '/v1/devices/enrol-tokens', { productSlug: other.slug })).json().code).toBe('NOT_ENTITLED');
  });
});

describe('agent enrolment', () => {
  it('trades a one-time code for a credential, once', async () => {
    const t = await setup();
    const token = await newToken(t.it, t.rel.slug);
    const res = await enrol(token);
    expect(res.statusCode).toBe(201);
    expect(res.json().credential).toContain('.');
    expect(res.json().heartbeatIntervalSeconds).toBe(300);

    const dev = await prisma.device.findUniqueOrThrow({ where: { id: res.json().deviceId } });
    expect(dev).toMatchObject({ orgId: t.orgId, status: 'ACTIVE', hostname: 'pc-01', platform: 'WINDOWS', arch: 'X64' });
    expect(res.json().credential).not.toContain(dev.secretHash);

    expect((await enrol(token)).json().code).toBe('INVALID_TOKEN'); // already used
  });

  it('rejects expired, unknown and malformed requests', async () => {
    const t = await setup();
    const token = await newToken(t.it, t.rel.slug);
    expect((await enrol('spe_unknown_unknown_unknown_unknown')).json().code).toBe('INVALID_TOKEN');
    expect((await enrol(token, { platform: 'android' })).statusCode).toBe(400); // mobile is Phase 4
    expect((await enrol(token, { agentVersion: 'banana' })).statusCode).toBe(400);

    const old = await newToken(t.it, t.rel.slug);
    await prisma.enrolmentToken.updateMany({ where: { orgId: t.orgId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await enrol(old)).json().code).toBe('INVALID_TOKEN');
  });

  it('enforces the device limit, and a refused code can be used again once a place is free', async () => {
    const t = await setup(2);
    const creds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const r = await enrol(await newToken(t.it, t.rel.slug), { hostname: `pc-${i}` });
      expect(r.statusCode).toBe(201);
      creds.push(r.json().deviceId);
    }
    const third = await newToken(t.it, t.rel.slug);
    const refused = await enrol(third);
    expect(refused.statusCode).toBe(409);
    expect(refused.json().code).toBe('ENDPOINT_LIMIT_REACHED');
    expect((await prisma.enrolmentToken.findMany({ where: { orgId: t.orgId } })).filter((x) => !x.usedAt)).toHaveLength(1); // not burned

    expect((await call(t.it, 'DELETE', `/v1/devices/${creds[0]}`)).statusCode).toBe(204);
    expect((await enrol(third)).statusCode).toBe(201);
  });

  it('adds up the limits of every active plan, and treats a plan with no limit as unlimited', async () => {
    const t = await setup(1);
    await grant({ orgId: t.orgId }, t.rel.product.id, t.rel.plan.id, { endpointLimit: 2 }); // a second invoice of 2 devices
    for (let i = 0; i < 3; i++) expect((await enrol(await newToken(t.it, t.rel.slug), { hostname: `pc-${i}` })).statusCode).toBe(201);
    expect((await enrol(await newToken(t.it, t.rel.slug))).statusCode).toBe(409);

    const u = await setup(null);
    for (let i = 0; i < 4; i++) expect((await enrol(await newToken(u.it, u.rel.slug), { hostname: `pc-${i}` })).statusCode).toBe(201);
  });

  it('lets only one of two simultaneous enrolments take the last place', async () => {
    const t = await setup(1);
    const [a, b] = [await newToken(t.it, t.rel.slug), await newToken(t.it, t.rel.slug)];
    const results = await Promise.all([enrol(a, { hostname: 'a' }), enrol(b, { hostname: 'b' })]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(await prisma.device.count({ where: { orgId: t.orgId, status: 'ACTIVE' } })).toBe(1);
  });
});

describe('agent heartbeat', () => {
  it('needs a valid credential, and a removed device is refused immediately', async () => {
    const t = await setup();
    const r = (await enrol(await newToken(t.it, t.rel.slug))).json() as { deviceId: string; credential: string };

    const ok = await beat(r.credential);
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ status: 'ok', intervalSeconds: 300 });

    expect((await call(null, 'POST', '/v1/agent/heartbeat', { agentVersion: '1.0.0' })).statusCode).toBe(401);
    expect((await beat(`${r.deviceId}.wrongsecret`)).statusCode).toBe(401);
    expect((await beat('nope.nope')).statusCode).toBe(401);

    await call(t.it, 'DELETE', `/v1/devices/${r.deviceId}`);
    const gone = await beat(r.credential);
    expect(gone.statusCode).toBe(401);
    expect(gone.json().code).toBe('DEVICE_REVOKED');
  });

  it('tells the agent when to update, and when it must', async () => {
    const t = await setup(5, [{ version: '1.0.0', minSupported: true }, { version: '1.2.0' }]);
    const { credential } = (await enrol(await newToken(t.it, t.rel.slug))).json() as { credential: string };

    const old = (await beat(credential, { agentVersion: '0.9.0' })).json();
    expect(old).toMatchObject({ latestVersion: '1.2.0', minSupportedVersion: '1.0.0', updateAvailable: true, updateRequired: true });
    expect((await beat(credential, { agentVersion: '1.0.0' })).json()).toMatchObject({ updateAvailable: true, updateRequired: false });
    expect((await beat(credential, { agentVersion: '1.2.0' })).json()).toMatchObject({ updateAvailable: false, updateRequired: false });
  });

  it('records activity, and goes quiet when the organisation no longer has a plan', async () => {
    const t = await setup();
    const r = (await enrol(await newToken(t.it, t.rel.slug))).json() as { deviceId: string; credential: string };
    await beat(r.credential, { agentVersion: '1.1.0', hostname: 'renamed-pc' });
    expect(await prisma.device.findUniqueOrThrow({ where: { id: r.deviceId } })).toMatchObject({ agentVersion: '1.1.0', hostname: 'renamed-pc' });

    await prisma.entitlement.update({ where: { id: t.ent.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const paused = (await beat(r.credential)).json();
    expect(paused).toMatchObject({ status: 'suspended', reason: 'no_active_plan', updateRequired: false });
    expect(paused.intervalSeconds).toBeGreaterThan(300);
  });
});

describe('the device list', () => {
  it('shows devices, usage and online state to those who may see them, and lets only device managers remove one', async () => {
    const t = await setup(3);
    const r = (await enrol(await newToken(t.it, t.rel.slug))).json() as { deviceId: string };

    const list = await call(t.auditor, 'GET', '/v1/devices');
    expect(list.statusCode).toBe(200);
    expect(list.json().devices[0]).toMatchObject({ id: r.deviceId, status: 'active', online: true, platform: 'windows', arch: 'x64', hostname: 'pc-01' });
    expect(list.json().usage[0]).toMatchObject({ active: 1, limit: 3 });
    expect(list.body).not.toContain('secretHash');

    expect((await call(t.standard, 'GET', '/v1/devices')).statusCode).toBe(403);
    expect((await call(t.auditor, 'DELETE', `/v1/devices/${r.deviceId}`)).statusCode).toBe(403);
    const { owner: stranger } = await createOrg(app, 'Stranger Co');
    expect((await call(stranger, 'DELETE', `/v1/devices/${r.deviceId}`)).statusCode).toBe(404); // another organisation's device
    expect((await call(t.it, 'DELETE', `/v1/devices/${r.deviceId}`)).statusCode).toBe(204);
    expect((await call(t.it, 'DELETE', `/v1/devices/${r.deviceId}`)).statusCode).toBe(404);
    expect((await call(t.it, 'GET', '/v1/devices')).json().usage[0].active).toBe(0);
  });
});
