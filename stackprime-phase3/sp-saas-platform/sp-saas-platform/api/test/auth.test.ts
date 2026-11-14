import * as OTPAuth from 'otpauth';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/db.js';
import { mailOutbox } from '../src/lib/mail.js';
import { redis } from '../src/lib/redis.js';

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

const PASSWORD = 'correct-horse-battery-9';
const uniqueEmail = () => `t${Date.now()}${Math.random().toString(36).slice(2, 8)}@example.test`;
const post = (url: string, payload: unknown, extra: Record<string, unknown> = {}) =>
  app.inject({ method: 'POST', url, payload: payload as object, ...extra });
const tokenFromMail = (to: string) => {
  const mail = [...mailOutbox].reverse().find((m) => m.to === to);
  const token = mail && new URL(mail.text.match(/https?:\/\/\S+/)![0]).searchParams.get('token');
  if (!token) throw new Error(`no email with a link for ${to}`);
  return token;
};
const refreshCookie = (res: { cookies: { name: string; value: string }[] }) =>
  res.cookies.find((c) => c.name === 'sp_rt')?.value as string;

async function registerVerified(email = uniqueEmail()) {
  expect((await post('/v1/auth/signup', { email, password: PASSWORD })).statusCode).toBe(202);
  expect((await post('/v1/auth/verify-email', { token: tokenFromMail(email) })).statusCode).toBe(200);
  return email;
}

describe('signup and verification', () => {
  it('blocks login until the email is verified, then allows it', async () => {
    const email = uniqueEmail();
    await post('/v1/auth/signup', { email, password: PASSWORD });
    const early = await post('/v1/auth/login', { email, password: PASSWORD });
    expect(early.statusCode).toBe(403);
    expect(early.json().code).toBe('EMAIL_NOT_VERIFIED');

    await post('/v1/auth/verify-email', { token: tokenFromMail(email) });
    const ok = await post('/v1/auth/login', { email, password: PASSWORD });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().accessToken).toBeTruthy();
  });

  it('does not reveal whether an email is registered', async () => {
    const email = await registerVerified();
    const dupe = await post('/v1/auth/signup', { email, password: PASSWORD });
    expect(dupe.statusCode).toBe(202);
  });

  it('rejects weak passwords and a reused verification link', async () => {
    expect((await post('/v1/auth/signup', { email: uniqueEmail(), password: 'short1' })).statusCode).toBe(400);
    const email = uniqueEmail();
    await post('/v1/auth/signup', { email, password: PASSWORD });
    const token = tokenFromMail(email);
    expect((await post('/v1/auth/verify-email', { token })).statusCode).toBe(200);
    expect((await post('/v1/auth/verify-email', { token })).statusCode).toBe(400);
  });
});

describe('login, /me and sessions', () => {
  it('returns the user with a valid access token and rejects a bad password', async () => {
    const email = await registerVerified();
    expect((await post('/v1/auth/login', { email, password: 'wrong-password-123' })).statusCode).toBe(401);
    const login = await post('/v1/auth/login', { email, password: PASSWORD });
    const me = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${login.json().accessToken}` } });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe(email);
    expect((await app.inject({ method: 'GET', url: '/v1/me' })).statusCode).toBe(401);
  });

  it('logout invalidates the access token immediately', async () => {
    const email = await registerVerified();
    const login = await post('/v1/auth/login', { email, password: PASSWORD });
    const auth = { authorization: `Bearer ${login.json().accessToken}` };
    await post('/v1/auth/logout', {}, { cookies: { sp_rt: refreshCookie(login) } });
    expect((await app.inject({ method: 'GET', url: '/v1/me', headers: auth })).statusCode).toBe(401);
  });
});

describe('refresh rotation', () => {
  it('rotates the token, tolerates a near-simultaneous retry, and revokes the session on later reuse', async () => {
    const email = await registerVerified();
    const login = await post('/v1/auth/login', { email, password: PASSWORD });
    const first = refreshCookie(login);
    const sessionId = first.split('.')[0]!;

    const rotated = await post('/v1/auth/refresh', {}, { cookies: { sp_rt: first } });
    expect(rotated.statusCode).toBe(200);
    const second = refreshCookie(rotated);
    expect(second).not.toBe(first);

    // The old token a moment later: treated as a race between two tabs, session stays alive.
    const race = await post('/v1/auth/refresh', {}, { cookies: { sp_rt: first } });
    expect(race.statusCode).toBe(401);
    expect(race.json().code).toBe('REFRESH_RACE');

    const third = await post('/v1/auth/refresh', {}, { cookies: { sp_rt: second } });
    expect(third.statusCode).toBe(200);
    const thirdCookie = refreshCookie(third);

    // A token two rotations old is simply rejected; it does not kill the session.
    expect((await post('/v1/auth/refresh', {}, { cookies: { sp_rt: first } })).statusCode).toBe(401);
    expect((await prisma.session.findUnique({ where: { id: sessionId } }))?.revokedAt).toBeNull();

    // `second` is now the most recently replaced token. Age the session so a replay cannot be a race,
    // then replay it: that is theft, and the whole session is revoked.
    await prisma.session.update({ where: { id: sessionId }, data: { lastUsedAt: new Date(Date.now() - 60_000) } });
    const stolen = await post('/v1/auth/refresh', {}, { cookies: { sp_rt: second } });
    expect(stolen.statusCode).toBe(401);
    expect((await prisma.session.findUnique({ where: { id: sessionId } }))?.revokedAt).not.toBeNull();

    // The legitimate newest token is dead too: the user must sign in again.
    expect((await post('/v1/auth/refresh', {}, { cookies: { sp_rt: thirdCookie } })).statusCode).toBe(401);
  });

  it('rejects a foreign Origin', async () => {
    const res = await post('/v1/auth/refresh', {}, { headers: { origin: 'https://evil.example' } });
    expect(res.statusCode).toBe(403);
  });
});

describe('password reset', () => {
  it('resets the password, signs out every session, and the link works once', async () => {
    const email = await registerVerified();
    const login = await post('/v1/auth/login', { email, password: PASSWORD });
    const auth = { authorization: `Bearer ${login.json().accessToken}` };

    expect((await post('/v1/auth/forgot-password', { email })).statusCode).toBe(202);
    expect((await post('/v1/auth/forgot-password', { email: 'nobody@example.test' })).statusCode).toBe(202);
    const token = tokenFromMail(email);

    const newPassword = 'another-strong-pass-42';
    expect((await post('/v1/auth/reset-password', { token, password: newPassword })).statusCode).toBe(200);
    expect((await post('/v1/auth/reset-password', { token, password: newPassword })).statusCode).toBe(400);

    expect((await app.inject({ method: 'GET', url: '/v1/me', headers: auth })).statusCode).toBe(401);
    expect((await post('/v1/auth/login', { email, password: PASSWORD })).statusCode).toBe(401);
    expect((await post('/v1/auth/login', { email, password: newPassword })).statusCode).toBe(200);
  });
});

describe('MFA', () => {
  it('enrols TOTP, requires it at login, and accepts each recovery code once', async () => {
    const email = await registerVerified();
    const login = await post('/v1/auth/login', { email, password: PASSWORD });
    const auth = { authorization: `Bearer ${login.json().accessToken}` };

    const setup = await post('/v1/auth/mfa/setup', {}, { headers: auth });
    expect(setup.statusCode).toBe(200);
    const totp = new OTPAuth.TOTP({ algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(setup.json().secret) });

    const enable = await post('/v1/auth/mfa/enable', { code: totp.generate() }, { headers: auth });
    expect(enable.statusCode).toBe(200);
    const recoveryCodes: string[] = enable.json().recoveryCodes;
    expect(recoveryCodes).toHaveLength(10);

    const noCode = await post('/v1/auth/login', { email, password: PASSWORD });
    expect(noCode.statusCode).toBe(401);
    expect(noCode.json().code).toBe('MFA_REQUIRED');

    expect((await post('/v1/auth/login', { email, password: PASSWORD, totp: '000000' })).statusCode).toBe(401);
    expect((await post('/v1/auth/login', { email, password: PASSWORD, totp: totp.generate() })).statusCode).toBe(200);

    const rc = recoveryCodes[0]!;
    expect((await post('/v1/auth/login', { email, password: PASSWORD, recoveryCode: rc })).statusCode).toBe(200);
    expect((await post('/v1/auth/login', { email, password: PASSWORD, recoveryCode: rc })).statusCode).toBe(401);
  });
});
