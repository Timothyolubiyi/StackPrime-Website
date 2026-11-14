import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { httpError } from './errors.js';

// A thin client for the few Paystack endpoints we use. Docs: https://paystack.com/docs/api/
// Amounts are always in the smallest unit (kobo for NGN, cents for USD).

async function call<T>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<T> {
  const key = config.PAYSTACK_SECRET_KEY;
  if (!key) throw httpError(503, 'BILLING_NOT_CONFIGURED', 'Online payments are not set up yet.');

  let res: Response;
  try {
    res = await fetch(`${config.PAYSTACK_BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw httpError(502, 'PAYMENT_PROVIDER_UNREACHABLE', 'Could not reach the payment provider. Try again shortly.');
  }
  const json = (await res.json().catch(() => null)) as { status?: boolean; data?: T } | null;
  if (!res.ok || !json?.status) {
    throw httpError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment provider could not complete that request.');
  }
  return json.data as T; // a few endpoints (disable) return no data
}

export interface PaystackCharge {
  id?: number;
  status?: string;
  reference: string;
  amount: number;
  currency: string;
  customer?: { customer_code?: string; email?: string } | null;
  plan?: { plan_code?: string } | null;
}

export const initializeTransaction = (p: {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  plan?: string; // with a plan code, Paystack bills the plan's amount and creates the subscription
  metadata?: Record<string, unknown>;
}) =>
  call<{ authorization_url: string; access_code: string; reference: string }>('POST', '/transaction/initialize', {
    email: p.email,
    amount: p.amount,
    currency: p.currency,
    reference: p.reference,
    callback_url: p.callbackUrl,
    ...(p.plan ? { plan: p.plan } : {}),
    metadata: p.metadata,
  });

export const verifyTransaction = (reference: string) =>
  call<PaystackCharge>('GET', `/transaction/verify/${encodeURIComponent(reference)}`);

export const createPlan = (p: { name: string; interval: 'monthly' | 'annually'; amount: number; currency: string }) =>
  call<{ plan_code: string }>('POST', '/plan', p);

export const disableSubscription = (code: string, emailToken: string) =>
  call<unknown>('POST', '/subscription/disable', { code, token: emailToken });

export const subscriptionManageLink = (code: string) =>
  call<{ link: string }>('GET', `/subscription/${encodeURIComponent(code)}/manage/link`);

/** Paystack signs the RAW request body with HMAC-SHA512 using the secret key (header x-paystack-signature). */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  const key = config.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;
  const expected = Buffer.from(createHmac('sha512', key).update(rawBody).digest('hex'));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
