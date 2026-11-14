import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config, isTest } from '../config.js';

// Production cost is 12. Tests create many users, so they use the minimum cost.
const BCRYPT_COST = isTest ? 4 : 12;

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// bcrypt silently truncates input at 72 bytes. Pre-hashing makes long passphrases safe and
// avoids the NUL-byte edge case. The pre-hash output is always 44 base64 characters.
const prehash = (password: string) => createHash('sha256').update(password, 'utf8').digest('base64');
export const hashPassword = (password: string) => bcrypt.hash(prehash(password), BCRYPT_COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(prehash(password), hash);

// Used when the account does not exist, so login timing does not reveal which emails are registered.
let dummyHash: Promise<string> | undefined;
const getDummyHash = (): Promise<string> => (dummyHash ??= hashPassword(randomToken(16)));
export const verifyAgainstDummy = async (password: string) => {
  await verifyPassword(password, await getDummyHash());
};

// ── AES-256-GCM for TOTP secrets at rest ──
function key(): Buffer {
  const k = Buffer.from(config.MFA_ENC_KEY, 'base64');
  if (k.length !== 32) throw new Error('MFA_ENC_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)');
  return k;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
}

export function decryptSecret(blob: string): string {
  const [v, iv, tag, ct] = blob.split('.');
  if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Unsupported secret format');
  const d = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8');
}

// Recovery codes look like "k3f9-a82m-xq71"; stored only as a hash.
export function newRecoveryCode(): string {
  const raw = randomBytes(9).toString('hex').slice(0, 12);
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}
export const normaliseRecoveryCode = (c: string) => c.trim().toLowerCase();
