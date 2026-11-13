import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, type EmailTokenType, type User } from '@prisma/client';
import * as OTPAuth from 'otpauth';
import { z } from 'zod';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_ABSOLUTE_MAX_DAYS,
  REFRESH_COOKIE,
  REFRESH_TOKEN_TTL_DAYS,
  config,
  isProd,
} from '../config.js';
import { audit } from '../lib/audit.js';
import {
  decryptSecret,
  encryptSecret,
  hashPassword,
  newRecoveryCode,
  normaliseRecoveryCode,
  randomToken,
  safeEqualHex,
  sha256,
  verifyAgainstDummy,
  verifyPassword,
} from '../lib/crypto.js';
import { prisma } from '../lib/db.js';
import {
  accountExistsMail,
  mfaChangedMail,
  passwordChangedMail,
  resetPasswordMail,
  sendMail,
  verifyEmailMail,
} from '../lib/mail.js';
import { redis } from '../lib/redis.js';
import { authenticate } from '../plugins/authenticate.js';

// ───────────── validation ─────────────

const email = z.string().trim().toLowerCase().email().max(254);
const password = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(128, 'Use at most 128 characters.')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Include both letters and numbers.');
const totpCode = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.');

const signupBody = z.object({ email, password, name: z.string().trim().min(1).max(100).optional() });
const loginBody = z.object({
  email,
  password: z.string().min(1).max(128),
  totp: totpCode.optional(),
  recoveryCode: z.string().trim().min(8).max(32).optional(),
});
const tokenBody = z.object({ token: z.string().min(20).max(200) });

// ───────────── helpers ─────────────

const DAY_MS = 24 * 60 * 60 * 1000;
// A string, because fast-jwt reads a bare number as milliseconds (900 would mean 0.9 seconds).
const ACCESS_JWT_EXPIRES_IN = `${ACCESS_TOKEN_TTL_SECONDS}s`;
const MAX_LOGIN_FAILURES = 8; // per email, per 15 minutes
const LOCKOUT_SECONDS = 15 * 60;
const REFRESH_RACE_WINDOW_MS = 10_000;

const GENERIC_ACCEPTED = { message: 'If that address can be used, an email is on its way.' };
const INVALID_CREDENTIALS = { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' };

const publicUser = (u: User) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  emailVerified: Boolean(u.emailVerifiedAt),
  mfaEnabled: u.mfaEnabled,
  isStaff: u.isStaff,
  orgId: u.orgId,
});

function setRefreshCookie(reply: FastifyReply, value: string, expires: Date) {
  reply.setCookie(REFRESH_COOKIE, value, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/v1/auth',
    expires,
  });
}
const clearRefreshCookie = (reply: FastifyReply) =>
  reply.clearCookie(REFRESH_COOKIE, { path: '/v1/auth', httpOnly: true, secure: isProd, sameSite: 'strict' });

// Cookie-bearing POSTs must come from our own front end (defence in depth on top of SameSite=Strict).
function originOk(req: FastifyRequest, reply: FastifyReply): boolean {
  const origin = req.headers.origin;
  if (origin && origin !== config.APP_ORIGIN) {
    reply.code(403).send({ code: 'BAD_ORIGIN', message: 'Request origin not allowed.' });
    return false;
  }
  return true;
}

async function startSession(req: FastifyRequest, reply: FastifyReply, userId: string) {
  const secret = randomToken(32);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * DAY_MS);
  const session = await prisma.session.create({
    data: {
      userId,
      refreshHash: sha256(secret),
      userAgent: req.headers['user-agent']?.slice(0, 300),
      ip: req.ip,
      expiresAt,
    },
  });
  setRefreshCookie(reply, `${session.id}.${secret}`, expiresAt);
  const accessToken = await reply.jwtSign({ sub: userId, sid: session.id }, { expiresIn: ACCESS_JWT_EXPIRES_IN });
  return { accessToken, sessionId: session.id };
}

async function createEmailToken(userId: string, type: EmailTokenType, ttlMs: number): Promise<string> {
  await prisma.emailToken.deleteMany({ where: { userId, type, usedAt: null } }); // only the newest link works
  const token = randomToken(32);
  await prisma.emailToken.create({
    data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

async function consumeEmailToken(token: string, type: EmailTokenType) {
  const row = await prisma.emailToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  const claimed = await prisma.emailToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  return claimed.count === 1 ? row : null;
}

async function revokeSessions(userId: string, exceptSessionId?: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
}

function buildTotp(secret: OTPAuth.Secret, label: string) {
  return new OTPAuth.TOTP({ issuer: 'StackPrime', label, algorithm: 'SHA1', digits: 6, period: 30, secret });
}

/** Valid for the current step +/- 1 (clock drift). With replayGuard, a code can be used only once. */
async function verifyTotp(userId: string, secretEnc: string, code: string, replayGuard = true): Promise<boolean> {
  const totp = buildTotp(OTPAuth.Secret.fromBase32(decryptSecret(secretEnc)), 'user');
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) return false;
  if (!replayGuard) return true;
  const step = Math.floor(Date.now() / 1000 / 30) + delta;
  return (await redis.set(`totp:used:${userId}:${step}`, '1', 'EX', 120, 'NX')) === 'OK';
}

async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const r = await prisma.mfaRecoveryCode.updateMany({
    where: { userId, codeHash: sha256(normaliseRecoveryCode(code)), usedAt: null },
    data: { usedAt: new Date() },
  });
  return r.count === 1;
}

// Failure counters are best-effort: if Redis is briefly unavailable, login keeps working.
async function failureCount(key: string): Promise<number> {
  try {
    return Number((await redis.get(key)) ?? 0);
  } catch {
    return 0;
  }
}
async function recordFailure(key: string) {
  try {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, LOCKOUT_SECONDS);
  } catch {
    /* best-effort */
  }
}
const clearFailures = (key: string) => redis.del(key).catch(() => undefined);

async function generateRecoveryCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: 10 }, newRecoveryCode);
  await prisma.$transaction([
    prisma.mfaRecoveryCode.deleteMany({ where: { userId } }),
    prisma.mfaRecoveryCode.createMany({ data: codes.map((c) => ({ userId, codeHash: sha256(normaliseRecoveryCode(c)) })) }),
  ]);
  return codes;
}

const rl = (max: number, timeWindow = '1 minute') => ({ config: { rateLimit: { max, timeWindow } } });
// Authenticated routes that must keep working while an org-required MFA enrolment is pending.
const authed = (max = 60) => ({
  preHandler: authenticate,
  config: { allowWithoutMfa: true, rateLimit: { max, timeWindow: '1 minute' } },
});

// ───────────── routes ─────────────

export default async function authRoutes(app: FastifyInstance) {
  // ── signup ──
  app.post('/signup', rl(5), async (req, reply) => {
    const body = signupBody.parse(req.body);
    // Hash before looking the account up, so response time is the same whether or not the email exists.
    const passwordHash = await hashPassword(body.password);

    let created: User | null = null;
    try {
      const existing = await prisma.user.findUnique({ where: { email: body.email } });
      if (!existing) created = await prisma.user.create({ data: { email: body.email, name: body.name, passwordHash } });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err; // lost a signup race
    }

    try {
      if (created) {
        const token = await createEmailToken(created.id, 'VERIFY_EMAIL', DAY_MS);
        await sendMail(verifyEmailMail(created.email, token));
        await audit(req, { action: 'auth.signup', actorId: created.id });
      } else {
        await sendMail(accountExistsMail(body.email));
      }
    } catch (err) {
      req.log.error({ err }, 'signup email failed'); // user can use "resend verification"
    }
    return reply.code(202).send(GENERIC_ACCEPTED);
  });

  app.post('/verify-email', rl(10), async (req, reply) => {
    const { token } = tokenBody.parse(req.body);
    const row = await consumeEmailToken(token, 'VERIFY_EMAIL');
    if (!row) return reply.code(400).send({ code: 'INVALID_TOKEN', message: 'This link is invalid or has expired.' });
    await prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } });
    await audit(req, { action: 'auth.email_verified', actorId: row.userId });
    return { message: 'Email confirmed. You can sign in now.' };
  });

  app.post('/resend-verification', rl(3), async (req, reply) => {
    const { email: addr } = z.object({ email }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: addr } });
    if (user && !user.emailVerifiedAt) {
      try {
        await sendMail(verifyEmailMail(user.email, await createEmailToken(user.id, 'VERIFY_EMAIL', DAY_MS)));
      } catch (err) {
        req.log.error({ err }, 'resend verification failed');
      }
    }
    return reply.code(202).send(GENERIC_ACCEPTED);
  });

  // ── login ──
  app.post('/login', rl(10), async (req, reply) => {
    const body = loginBody.parse(req.body);
    const failKey = `login:fail:${body.email}`;

    if ((await failureCount(failKey)) >= MAX_LOGIN_FAILURES) {
      return reply.code(429).send({
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many failed attempts. Try again in 15 minutes, or reset your password.',
      });
    }

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    let passwordOk = false;
    if (user) passwordOk = await verifyPassword(body.password, user.passwordHash);
    else await verifyAgainstDummy(body.password); // same work either way, so timing does not reveal registered emails
    if (!user || !passwordOk) {
      await recordFailure(failKey);
      if (user) await audit(req, { action: 'auth.login_failed', actorId: user.id, orgId: user.orgId });
      return reply.code(401).send(INVALID_CREDENTIALS);
    }

    // Only reveal "not verified" once the password is proven correct.
    if (!user.emailVerifiedAt) {
      return reply.code(403).send({ code: 'EMAIL_NOT_VERIFIED', message: 'Confirm your email address first.' });
    }

    if (user.mfaEnabled && user.mfaSecretEnc) {
      if (!body.totp && !body.recoveryCode) {
        return reply.code(401).send({ code: 'MFA_REQUIRED', message: 'Enter your 6-digit authentication code.' });
      }
      const ok = body.totp
        ? await verifyTotp(user.id, user.mfaSecretEnc, body.totp)
        : await consumeRecoveryCode(user.id, body.recoveryCode!);
      if (!ok) {
        await recordFailure(failKey);
        await audit(req, { action: 'auth.mfa_failed', actorId: user.id, orgId: user.orgId });
        return reply.code(401).send({ code: 'INVALID_MFA_CODE', message: 'That code is not valid.' });
      }
      if (body.recoveryCode) await audit(req, { action: 'auth.recovery_code_used', actorId: user.id, orgId: user.orgId });
    }

    await clearFailures(failKey);
    const { accessToken, sessionId } = await startSession(req, reply, user.id);
    await audit(req, { action: 'auth.login', actorId: user.id, orgId: user.orgId, targetType: 'session', targetId: sessionId });

    const org = user.orgId ? await prisma.org.findUnique({ where: { id: user.orgId }, select: { mfaRequired: true } }) : null;
    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: publicUser(user),
      mfaEnrolmentRequired: Boolean(org?.mfaRequired && !user.mfaEnabled),
    };
  });

  // ── refresh (rotation + reuse detection) ──
  app.post('/refresh', rl(30), async (req, reply) => {
    if (!originOk(req, reply)) return;
    const raw = req.cookies[REFRESH_COOKIE];
    const dot = raw?.indexOf('.') ?? -1;
    if (!raw || dot < 1) return reply.code(401).send({ code: 'UNAUTHENTICATED', message: 'Sign in required.' });
    const sessionId = raw.slice(0, dot);
    const presentedHash = sha256(raw.slice(dot + 1));

    const fail = (code = 'UNAUTHENTICATED') => {
      clearRefreshCookie(reply);
      return reply.code(401).send({ code, message: 'Sign in required.' });
    };

    const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
    const now = new Date();
    if (!session || session.revokedAt || session.expiresAt < now) return fail();
    if (now.getTime() - session.createdAt.getTime() > REFRESH_ABSOLUTE_MAX_DAYS * DAY_MS) return fail();
    if (!session.user.emailVerifiedAt) return fail();

    if (safeEqualHex(presentedHash, session.refreshHash)) {
      const nextSecret = randomToken(32);
      const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * DAY_MS);
      // Compare-and-swap: if two requests rotate at once, only one wins.
      const swapped = await prisma.session.updateMany({
        where: { id: session.id, refreshHash: session.refreshHash },
        data: { refreshHash: sha256(nextSecret), prevRefreshHash: session.refreshHash, lastUsedAt: now, expiresAt },
      });
      if (swapped.count !== 1) return reply.code(401).send({ code: 'REFRESH_RACE', message: 'Retry the request.' });
      setRefreshCookie(reply, `${session.id}.${nextSecret}`, expiresAt);
      const accessToken = await reply.jwtSign({ sub: session.userId, sid: session.id }, { expiresIn: ACCESS_JWT_EXPIRES_IN });
      return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS, user: publicUser(session.user) };
    }

    if (session.prevRefreshHash && safeEqualHex(presentedHash, session.prevRefreshHash)) {
      // An already-rotated token. Within a few seconds it is almost certainly two browser tabs racing
      // (the browser already holds the newer cookie). Later than that, treat it as theft.
      if (now.getTime() - session.lastUsedAt.getTime() < REFRESH_RACE_WINDOW_MS) {
        return reply.code(401).send({ code: 'REFRESH_RACE', message: 'Retry the request.' });
      }
      await prisma.session.update({ where: { id: session.id }, data: { revokedAt: now } });
      await audit(req, {
        action: 'auth.refresh_reuse_detected',
        actorId: session.userId,
        orgId: session.user.orgId,
        targetType: 'session',
        targetId: session.id,
      });
      return fail();
    }
    return fail();
  });

  // ── logout ──
  app.post('/logout', rl(30), async (req, reply) => {
    if (!originOk(req, reply)) return;
    const raw = req.cookies[REFRESH_COOKIE];
    const sessionId = raw && raw.indexOf('.') > 0 ? raw.slice(0, raw.indexOf('.')) : null;
    if (sessionId) {
      const s = await prisma.session.findUnique({ where: { id: sessionId } });
      // Only revoke when the secret matches, so a guessed session id cannot log someone out.
      if (s && !s.revokedAt && safeEqualHex(sha256(raw!.slice(raw!.indexOf('.') + 1)), s.refreshHash)) {
        await prisma.session.update({ where: { id: s.id }, data: { revokedAt: new Date() } });
        await audit(req, { action: 'auth.logout', actorId: s.userId, targetType: 'session', targetId: s.id });
      }
    }
    clearRefreshCookie(reply);
    return reply.code(204).send();
  });

  app.post('/logout-all', authed(10), async (req, reply) => {
    const a = req.auth!;
    await revokeSessions(a.user.id);
    await audit(req, { action: 'auth.logout_all', actorId: a.user.id, orgId: a.user.orgId });
    clearRefreshCookie(reply);
    return reply.code(204).send();
  });

  // ── password reset ──
  app.post('/forgot-password', rl(3), async (req, reply) => {
    const { email: addr } = z.object({ email }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: addr } });
    if (user) {
      try {
        const token = await createEmailToken(user.id, 'RESET_PASSWORD', 60 * 60 * 1000);
        await sendMail(resetPasswordMail(user.email, token));
        await audit(req, { action: 'auth.password_reset_requested', actorId: user.id, orgId: user.orgId });
      } catch (err) {
        req.log.error({ err }, 'password reset email failed');
      }
    }
    return reply.code(202).send(GENERIC_ACCEPTED);
  });

  app.post('/reset-password', rl(5), async (req, reply) => {
    const body = z.object({ token: tokenBody.shape.token, password }).parse(req.body);
    const row = await consumeEmailToken(body.token, 'RESET_PASSWORD');
    if (!row) return reply.code(400).send({ code: 'INVALID_TOKEN', message: 'This link is invalid or has expired.' });
    const user = await prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(body.password), emailVerifiedAt: new Date() }, // the link proves mailbox ownership
    });
    await revokeSessions(user.id);
    await clearFailures(`login:fail:${user.email}`);
    await audit(req, { action: 'auth.password_reset', actorId: user.id, orgId: user.orgId });
    sendMail(passwordChangedMail(user.email)).catch((err) => req.log.error({ err }, 'notice email failed'));
    return { message: 'Password updated. Sign in with your new password.' };
  });

  app.post('/change-password', authed(5), async (req) => {
    const a = req.auth!;
    const body = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).parse(req.body);
    if (!(await verifyPassword(body.currentPassword, a.user.passwordHash))) {
      throw Object.assign(new Error('Current password is incorrect.'), { statusCode: 400, code: 'INVALID_CREDENTIALS' });
    }
    await prisma.user.update({ where: { id: a.user.id }, data: { passwordHash: await hashPassword(body.newPassword) } });
    await revokeSessions(a.user.id, a.sessionId); // keep this device signed in
    await audit(req, { action: 'auth.password_changed', actorId: a.user.id, orgId: a.user.orgId });
    sendMail(passwordChangedMail(a.user.email)).catch((err) => req.log.error({ err }, 'notice email failed'));
    return { message: 'Password changed. Other devices were signed out.' };
  });

  // ── sessions ──
  app.get('/sessions', authed(), async (req) => {
    const a = req.auth!;
    const rows = await prisma.session.findMany({
      where: { userId: a.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, userAgent: true, ip: true, createdAt: true, lastUsedAt: true },
    });
    return { sessions: rows.map((r) => ({ ...r, current: r.id === a.sessionId })) };
  });

  app.delete<{ Params: { id: string } }>('/sessions/:id', authed(30), async (req, reply) => {
    const a = req.auth!;
    const r = await prisma.session.updateMany({
      where: { id: req.params.id, userId: a.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (r.count !== 1) return reply.code(404).send({ code: 'NOT_FOUND', message: 'Session not found.' });
    await audit(req, { action: 'auth.session_revoked', actorId: a.user.id, orgId: a.user.orgId, targetType: 'session', targetId: req.params.id });
    return reply.code(204).send();
  });

  // ── MFA (TOTP) ──
  app.post('/mfa/setup', authed(10), async (req, reply) => {
    const u = req.auth!.user;
    if (u.mfaEnabled) return reply.code(409).send({ code: 'MFA_ALREADY_ENABLED', message: 'Two-factor authentication is already on.' });
    const secret = new OTPAuth.Secret({ size: 20 });
    await prisma.user.update({ where: { id: u.id }, data: { mfaSecretEnc: encryptSecret(secret.base32) } });
    return { secret: secret.base32, otpauthUrl: buildTotp(secret, u.email).toString() };
  });

  app.post('/mfa/enable', authed(10), async (req, reply) => {
    const u = req.auth!.user;
    const { code } = z.object({ code: totpCode }).parse(req.body);
    if (u.mfaEnabled) return reply.code(409).send({ code: 'MFA_ALREADY_ENABLED', message: 'Two-factor authentication is already on.' });
    if (!u.mfaSecretEnc) return reply.code(400).send({ code: 'MFA_NOT_STARTED', message: 'Start setup first.' });
    if (!(await verifyTotp(u.id, u.mfaSecretEnc, code, false))) {
      return reply.code(400).send({ code: 'INVALID_MFA_CODE', message: 'That code is not valid.' });
    }
    await prisma.user.update({ where: { id: u.id }, data: { mfaEnabled: true } });
    const recoveryCodes = await generateRecoveryCodes(u.id);
    await audit(req, { action: 'auth.mfa_enabled', actorId: u.id, orgId: u.orgId });
    sendMail(mfaChangedMail(u.email, true)).catch((err) => req.log.error({ err }, 'notice email failed'));
    return { enabled: true, recoveryCodes, notice: 'Store these recovery codes safely. Each works once and they are not shown again.' };
  });

  app.post('/mfa/disable', authed(5), async (req, reply) => {
    const u = req.auth!.user;
    const body = z.object({ password: z.string().min(1).max(128), code: totpCode }).parse(req.body);
    if (!u.mfaEnabled || !u.mfaSecretEnc) return reply.code(400).send({ code: 'MFA_NOT_ENABLED', message: 'Two-factor authentication is not on.' });
    if (u.org?.mfaRequired) {
      return reply.code(403).send({ code: 'MFA_REQUIRED_BY_ORG', message: 'Your organisation requires two-factor authentication.' });
    }
    if (!(await verifyPassword(body.password, u.passwordHash)) || !(await verifyTotp(u.id, u.mfaSecretEnc, body.code))) {
      return reply.code(400).send({ code: 'INVALID_CREDENTIALS', message: 'Password or code is incorrect.' });
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: u.id }, data: { mfaEnabled: false, mfaSecretEnc: null } }),
      prisma.mfaRecoveryCode.deleteMany({ where: { userId: u.id } }),
    ]);
    await audit(req, { action: 'auth.mfa_disabled', actorId: u.id, orgId: u.orgId });
    sendMail(mfaChangedMail(u.email, false)).catch((err) => req.log.error({ err }, 'notice email failed'));
    return { enabled: false };
  });
}
