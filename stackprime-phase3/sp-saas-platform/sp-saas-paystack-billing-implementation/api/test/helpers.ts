import * as OTPAuth from 'otpauth';
import { expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
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
