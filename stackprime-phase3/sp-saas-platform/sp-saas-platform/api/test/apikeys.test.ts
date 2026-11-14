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
const call = (u: TestUser | null, m: 'GET' | 'POST' | 'DELETE', url: string, payload?: object, headers?: Record<string, string>) => rawCall(app, u, m, url, payload, headers);
const withKey = (key: string) => ({ authorization: `ApiKey ${key}` });

async function setup() {
  const { owner, orgId } = await createOrg(app);
  const it = await createUser(app);
  await addMember(app, owner, it, ['IT_ADMIN']);
  const standard = await createUser(app);
  await addMember(app, owner, standard, ['STANDARD_USER']);
  const rel = await seedRelease();
  await grant({ orgId }, rel.product.id, rel.plan.id);
  return { owner, it, standard, orgId, rel };
}

describe('creating keys', () => {
  it('shows the key once, stores only a hash, and lists keys without it', async () => {
    const t = await setup();
    const res = await call(t.it, 'POST', '/v1/api-keys', { name: 'CI pipeline', roles: ['STANDARD_USER'] });
    expect(res.statusCode).toBe(201);
    const key = res.json().key as string;
    expect(key).toMatch(/^spk_/);

    const row = await prisma.apiKey.findUniqueOrThrow({ where: { id: res.json().id } });
    expect(row.keyHash).not.toBe(key);
    expect(JSON.stringify(row)).not.toContain(key);

    const list = await call(t.it, 'GET', '/v1/api-keys');
    expect(list.json().keys[0]).toMatchObject({ name: 'CI pipeline', prefix: key.slice(0, 12) });
    expect(list.body).not.toContain(key);
  });

  it('is limited to people who manage keys, safe roles, and no more access than the creator has', async () => {
    const t = await setup();
    expect((await call(t.standard, 'POST', '/v1/api-keys', { name: 'x', roles: ['STANDARD_USER'] })).statusCode).toBe(403);
    expect((await call(null, 'POST', '/v1/api-keys', { name: 'x', roles: ['STANDARD_USER'] })).statusCode).toBe(401);
    expect((await call(t.owner, 'POST', '/v1/api-keys', { name: 'x', roles: ['ORG_OWNER'] })).statusCode).toBe(400); // never an owner
    expect((await call(t.owner, 'POST', '/v1/api-keys', { name: 'x', roles: ['BILLING_ADMIN'] })).statusCode).toBe(400); // never billing
    // An IT admin cannot read audit logs, so cannot mint a key that can.
    expect((await call(t.it, 'POST', '/v1/api-keys', { name: 'x', roles: ['AUDITOR'] })).statusCode).toBe(403);
    expect((await call(t.owner, 'POST', '/v1/api-keys', { name: 'x', roles: ['AUDITOR'] })).statusCode).toBe(201);
  });
});

describe('using keys', () => {
  it('reads what its roles allow, and nothing else', async () => {
    const t = await setup();
    const std = (await call(t.it, 'POST', '/v1/api-keys', { name: 'std', roles: ['STANDARD_USER'] })).json().key as string;
    const aud = (await call(t.owner, 'POST', '/v1/api-keys', { name: 'aud', roles: ['AUDITOR'] })).json().key as string;

    const ents = await call(null, 'GET', '/v1/entitlements', undefined, withKey(std));
    expect(ents.statusCode).toBe(200);
    expect(ents.json().entitlements[0].product.slug).toBe(t.rel.slug);

    expect((await call(null, 'GET', '/v1/devices', undefined, withKey(std))).statusCode).toBe(403); // standard users cannot see devices
    expect((await call(null, 'GET', '/v1/devices', undefined, withKey(aud))).statusCode).toBe(200);

    // Keys work only on the routes that opt in: they cannot download, buy, or manage anything.
    expect((await call(null, 'POST', '/v1/downloads', { artifactId: t.rel.releases['1.0.0']!.windows.id }, withKey(std))).statusCode).toBe(401);
    expect((await call(null, 'POST', '/v1/api-keys', { name: 'x', roles: ['STANDARD_USER'] }, withKey(std))).statusCode).toBe(401);
  });

  it('stops working when revoked, and unknown or malformed keys are refused', async () => {
    const t = await setup();
    const made = (await call(t.it, 'POST', '/v1/api-keys', { name: 'temp', roles: ['STANDARD_USER'] })).json() as { id: string; key: string };
    expect((await call(null, 'GET', '/v1/entitlements', undefined, withKey(made.key))).statusCode).toBe(200);

    expect((await call(t.standard, 'DELETE', `/v1/api-keys/${made.id}`)).statusCode).toBe(403);
    const { owner: stranger } = await createOrg(app, 'Stranger Co');
    expect((await call(stranger, 'DELETE', `/v1/api-keys/${made.id}`)).statusCode).toBe(404); // another organisation's key
    expect((await call(t.it, 'DELETE', `/v1/api-keys/${made.id}`)).statusCode).toBe(204);

    expect((await call(null, 'GET', '/v1/entitlements', undefined, withKey(made.key))).statusCode).toBe(401);
    expect((await call(null, 'GET', '/v1/entitlements', undefined, withKey('spk_doesnotexistdoesnotexistdoesnotexist'))).statusCode).toBe(401);
    expect((await call(null, 'GET', '/v1/entitlements', undefined, withKey('garbage'))).statusCode).toBe(401);
    expect((await call(t.it, 'GET', '/v1/api-keys')).json().keys).toEqual([]);
  });
});
