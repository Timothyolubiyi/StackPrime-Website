import * as OTPAuth from 'otpauth';
import { expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../src/lib/db.js';
import type { StaffRole } from '@prisma/client';
import { mailOutbox } from '../src/lib/mail.js';

export const PASSWORD = 'correct-horse-battery-9';

export const uniqueEmail = () => `t${Date.now()}${Math.random().toString(36).slice(2, 8)}@example.test`;

/** The token from the newest email to `to` whose subject contains `subjectPart`. */
export function tokenFromMail(to: string, subjectPart: string): string {
  const mail = [...mailOutbox].reverse().find((m) => m.to === to && m.subject.includes(subjectPart));
  const url = mail?.text.match(/https?:\/\/\S+/)?.[0];
  const token = url ? new URL(url).searchParams.get('token') : null;
  if (!token) throw new Error(`no "${subjectPart}" email with a token for ${to}`);
  return token;
}

export interface TestUser {
  email: string;
  token: string;
  headers: { authorization: string };
}

/** Signs up, verifies the email, and logs in. */
export async function createUser(app: FastifyInstance, email = uniqueEmail()): Promise<TestUser> {
  const signup = await app.inject({ method: 'POST', url: '/v1/auth/signup', payload: { email, password: PASSWORD } });
  expect(signup.statusCode).toBe(202);
  const verify = await app.inject({
    method: 'POST',
    url: '/v1/auth/verify-email',
    payload: { token: tokenFromMail(email, 'Confirm your StackPrime account') },
  });
  expect(verify.statusCode).toBe(200);
  const login = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email, password: PASSWORD } });
  expect(login.statusCode).toBe(200);
  const token = login.json().accessToken as string;
  return { email, token, headers: { authorization: `Bearer ${token}` } };
}

/** Turns on TOTP MFA for a signed-in user. */
export async function enableMfa(app: FastifyInstance, user: TestUser): Promise<void> {
  const setup = await app.inject({ method: 'POST', url: '/v1/auth/mfa/setup', headers: user.headers });
  expect(setup.statusCode).toBe(200);
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(setup.json().secret),
  });
  const enable = await app.inject({ method: 'POST', url: '/v1/auth/mfa/enable', headers: user.headers, payload: { code: totp.generate() } });
  expect(enable.statusCode).toBe(200);
}

/** A StackPrime staff account. Staff routes also require MFA, so it is enabled by default. */
export async function createStaff(
  app: FastifyInstance,
  withMfa = true,
  roles: StaffRole[] = ['SUPER_ADMIN'],
): Promise<TestUser> {
  const u = await createUser(app);
  await prisma.user.update({
    where: { email: u.email },
    data: { isStaff: true, staffRoles: roles },
  });
  if (withMfa) await enableMfa(app, u);
  return u;
}

/** Owner invites `user`, who accepts. */
export async function addMember(app: FastifyInstance, owner: TestUser, user: TestUser, roles: string[]): Promise<void> {
  const invite = await app.inject({ method: 'POST', url: '/v1/orgs/me/invites', headers: owner.headers, payload: { email: user.email, roles } });
  expect(invite.statusCode).toBe(201);
  const accept = await app.inject({
    method: 'POST',
    url: '/v1/invites/accept',
    headers: user.headers,
    payload: { token: tokenFromMail(user.email, 'invited') },
  });
  expect(accept.statusCode).toBe(200);
}

const rand = () => Math.random().toString(36).slice(2, 10);

/** An owner with a new organisation. */
export async function createOrg(app: FastifyInstance, name = 'Test Org Ltd'): Promise<{ owner: TestUser; orgId: string }> {
  const owner = await createUser(app);
  const created = await app.inject({ method: 'POST', url: '/v1/orgs', headers: owner.headers, payload: { name } });
  expect(created.statusCode).toBe(201);
  return { owner, orgId: created.json().id as string };
}

/**
 * A product with one plan and published releases. Each release has a Windows and a Debian (arm64) file.
 * `limit` is the plan's device limit (null = unlimited). Extra drafts can be added by the test.
 */
export async function seedRelease(opts: { limit?: number | null; versions?: { version: string; minSupported?: boolean }[] } = {}) {
  const limit = opts.limit === undefined ? 5 : opts.limit;
  const slug = `r-${rand()}`;
  const product = await prisma.product.create({
    data: { slug, name: 'Release Test', description: 'd', plans: { create: [{ code: 'pro', name: 'Pro', billingModel: 'SUBSCRIPTION', interval: 'MONTH', endpointLimit: limit }] } },
  });
  const plan = await prisma.plan.findFirstOrThrow({ where: { productId: product.id } });
  const releases: Record<string, { id: string; windows: { id: string; storageKey: string; filename: string }; deb: { id: string } }> = {};
  for (const [i, v] of (opts.versions ?? [{ version: '1.0.0' }]).entries()) {
    const version = await prisma.version.create({
      data: { productId: product.id, version: v.version, minSupported: v.minSupported ?? false, publishedAt: new Date(Date.now() - (10 - i) * 1000), changelog: `Release ${v.version}` },
    });
    const windows = await prisma.artifact.create({
      data: { versionId: version.id, platform: 'WINDOWS', arch: 'X64', filename: `agent-${v.version}.msi`, storageKey: `${slug}/${v.version}/agent-${v.version}.msi`, sha256: 'a'.repeat(64), sizeBytes: BigInt(1000) },
    });
    const deb = await prisma.artifact.create({
      data: { versionId: version.id, platform: 'LINUX_DEB', arch: 'ARM64', filename: `agent-${v.version}-arm64.deb`, storageKey: `${slug}/${v.version}/agent-${v.version}-arm64.deb`, sha256: 'b'.repeat(64), sizeBytes: BigInt(2000) },
    });
    releases[v.version] = { id: version.id, windows, deb };
  }
  return { slug, product, plan, releases };
}

/** Gives an organisation (or a person) an active entitlement without going through payment. */
export async function grant(target: { orgId?: string; userId?: string }, productId: string, planId: string, extra: { expiresAt?: Date | null; endpointLimit?: number | null } = {}) {
  return prisma.entitlement.create({
    data: { orgId: target.orgId, userId: target.userId, productId, planId, status: 'ACTIVE', source: 'MANUAL', expiresAt: extra.expiresAt ?? null, endpointLimit: extra.endpointLimit ?? null },
  });
}

export const call = (app: FastifyInstance, user: TestUser | null, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: object, headers: Record<string, string> = {}) =>
  app.inject({ method, url, payload, headers: { ...(user ? user.headers : {}), ...headers } });
