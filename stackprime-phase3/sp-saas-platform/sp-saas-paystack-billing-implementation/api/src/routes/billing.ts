import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { config } from '../config.js';
import { audit } from '../lib/audit.js';
import { decryptSecret, encryptSecret } from '../lib/crypto.js';
import { prisma } from '../lib/db.js';
import { httpError } from '../lib/errors.js';
import { authenticate, requirePermission } from '../plugins/authenticate.js';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

type PaystackEnvelope<T> = { status: boolean; message: string; data: T };
type PaystackInitData = { authorization_url: string; access_code: string; reference: string };
type PaystackPlanData = { amount: number; currency: string; interval: string };

type PaystackWebhookData = {
  id?: string | number;
  reference?: string;
  status?: string;
  amount?: number;
  currency?: string;
  paid_at?: string;
  customer?: { customer_code?: string; email?: string };
  plan?: { plan_code?: string; interval?: string; amount?: number; currency?: string };
  subscription?: { subscription_code?: string; email_token?: string; next_payment_date?: string };
  subscription_code?: string;
  email_token?: string;
  next_payment_date?: string;
  invoice_code?: string;
  metadata?: Record<string, unknown> | string | null;
};

type PaystackVerifyData = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string;
  customer?: { customer_code?: string; email?: string };
  subscription?: { subscription_code?: string; email_token?: string; next_payment_date?: string };
  metadata?: Record<string, unknown> | string | null;
};

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  if (!config.PAYSTACK_ENABLED || !config.PAYSTACK_SECRET_KEY) {
    throw httpError(503, 'PAYMENTS_DISABLED', 'Paystack checkout is not enabled.');
  }
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const result = (await response.json().catch(() => null)) as PaystackEnvelope<T> | null;
  if (!response.ok || !result?.status) {
    throw httpError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment provider could not complete the request.');
  }
  return result.data;
}

function signatureIsValid(raw: Buffer, signature: string | undefined): boolean {
  if (!config.PAYSTACK_SECRET_KEY || !signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac('sha512', config.PAYSTACK_SECRET_KEY).update(raw).digest();
  const supplied = Buffer.from(signature, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function periodEnd(start: Date, interval: 'MONTH' | 'YEAR' | 'ONE_TIME'): Date | null {
  if (interval === 'ONE_TIME') return null;
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  if (interval === 'MONTH') end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCFullYear(end.getUTCFullYear() + 1);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}

async function applySuccessfulCharge(data: PaystackVerifyData) {
  const payment = await prisma.payment.findUnique({
    where: { providerReference: data.reference },
    include: { subscription: { include: { plan: { include: { product: true } } } } },
  });
  if (!payment) throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment reference was not found.');
  if (data.status !== 'success' || data.amount !== payment.amountMinor || data.currency !== payment.currency) {
    throw httpError(400, 'PAYMENT_MISMATCH', 'The verified payment does not match the expected amount and currency.');
  }
  if (payment.status === 'SUCCEEDED') return { alreadyProcessed: true };

  const metadata = typeof data.metadata === 'object' && data.metadata ? data.metadata : (payment.metadata as Record<string, unknown> | null) ?? {};
  const subscriptionId = payment.subscriptionId ?? (typeof metadata.subscriptionId === 'string' ? metadata.subscriptionId : null);
  const now = data.paid_at ? new Date(data.paid_at) : new Date();

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: 'SUCCEEDED' } },
      data: { status: 'SUCCEEDED', paidAt: now, failureReason: null },
    });
    if (claimed.count === 0) return;

    let sub = payment.subscription;
    if (subscriptionId) {
      const start = now;
      const end = periodEnd(start, payment.subscription?.interval ?? 'ONE_TIME');
      sub = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: start,
          currentPeriodEnd: data.subscription?.next_payment_date ? new Date(data.subscription.next_payment_date) : end,
          gracePeriodEnd: null,
          providerCustomerCode: data.customer?.customer_code ?? undefined,
          providerSubscriptionCode: data.subscription?.subscription_code ?? undefined,
          providerEmailToken: data.subscription?.email_token ? encryptSecret(data.subscription.email_token) : undefined,
        },
        include: { plan: { include: { product: true } } },
      });
    }

    const owner = sub
      ? { orgId: sub.orgId, userId: sub.userId }
      : { orgId: typeof metadata.orgId === 'string' ? metadata.orgId : null, userId: typeof metadata.userId === 'string' ? metadata.userId : null };
    const planId = sub?.planId ?? (typeof metadata.planId === 'string' ? metadata.planId : null);
    if (!planId || (!!owner.orgId === !!owner.userId)) {
      throw new Error('Payment metadata does not identify exactly one entitlement owner and a plan.');
    }
    const plan = await tx.plan.findUnique({ where: { id: planId }, include: { product: true } });
    if (!plan) throw new Error('The paid plan no longer exists.');

    const existingEntitlement = sub
      ? await tx.entitlement.findUnique({ where: { subscriptionId: sub.id } })
      : await tx.entitlement.findUnique({ where: { paymentId: payment.id } });
    if (!existingEntitlement) {
      await tx.entitlement.create({
        data: {
          ...owner,
          productId: plan.productId,
          planId: plan.id,
          status: 'ACTIVE',
          source: 'PAYMENT',
          paymentId: payment.id,
          subscriptionId: sub?.id ?? null,
          startsAt: now,
          expiresAt: sub?.currentPeriodEnd ?? null,
        },
      });
    } else {
      await tx.entitlement.update({
        where: { id: existingEntitlement.id },
        data: { status: 'ACTIVE', startsAt: now, expiresAt: sub?.currentPeriodEnd ?? null, subscriptionId: sub?.id ?? null },
      });
    }
  });
  return { alreadyProcessed: false };
}

export default async function billingRoutes(app: FastifyInstance) {
  // Capture exact bytes for Paystack's HMAC-SHA512 webhook signature while still parsing JSON.
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    req.rawBody = body as Buffer;
    try {
      done(null, JSON.parse((body as Buffer).toString('utf8')));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  app.post('/billing/checkout', { preHandler: requirePermission('billing:manage'), config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = z.object({
      planId: z.string().min(1).max(100),
      currency: z.string().trim().length(3).transform((v) => v.toUpperCase()),
    }).parse(req.body);
    const { user } = req.auth!;
    const plan = await prisma.plan.findFirst({
      where: { id: body.planId, isActive: true, product: { isActive: true } },
      include: { product: true },
    });
    if (!plan) throw httpError(404, 'PLAN_NOT_FOUND', 'The selected plan is unavailable.');
    const price = await prisma.planPrice.findUnique({
      where: { planId_provider_currency: { planId: plan.id, provider: 'PAYSTACK', currency: body.currency } },
    });
    if (!price?.isActive) throw httpError(400, 'PRICE_UNAVAILABLE', 'There is no active Paystack price for this plan and currency.');
    if (plan.billingModel === 'SUBSCRIPTION' && (plan.interval === 'ONE_TIME' || !price.paystackPlanCode)) {
      throw httpError(409, 'RECURRING_PLAN_NOT_CONFIGURED', 'This recurring plan needs a Paystack plan code before checkout.');
    }
    if (plan.billingModel === 'PERPETUAL' && plan.interval !== 'ONE_TIME') {
      throw httpError(409, 'INVALID_PLAN_CONFIGURATION', 'A perpetual plan must use the one-time billing interval.');
    }

    if (price.paystackPlanCode) {
      const providerPlan = await paystack<PaystackPlanData>(`/plan/${encodeURIComponent(price.paystackPlanCode)}`);
      const expectedInterval = plan.interval === 'MONTH' ? 'monthly' : 'annually';
      if (providerPlan.amount !== price.amountMinor || providerPlan.currency !== price.currency || providerPlan.interval !== expectedInterval) {
        throw httpError(409, 'PAYSTACK_PLAN_PRICE_MISMATCH', 'The configured Paystack plan amount, currency or billing interval does not match this plan price.');
      }
    }

    const reference = `sp-${randomBytes(18).toString('hex')}`;
    const owner = user.orgId ? { orgId: user.orgId, userId: null } : { orgId: null, userId: user.id };
    const created = await prisma.$transaction(async (tx) => {
      const subscription = plan.billingModel === 'SUBSCRIPTION'
        ? await tx.subscription.create({
            data: {
              ...owner, planId: plan.id, customerEmail: user.email, provider: 'PAYSTACK', status: 'PENDING',
              currency: price.currency, amountMinor: price.amountMinor, interval: plan.interval,
            },
          })
        : null;
      const payment = await tx.payment.create({
        data: {
          subscriptionId: subscription?.id,
          provider: 'PAYSTACK',
          providerReference: reference,
          amountMinor: price.amountMinor,
          currency: price.currency,
          status: 'INITIALIZED',
          metadata: { planId: plan.id, productId: plan.productId, ...owner },
        },
      });
      return { subscription, payment };
    });

    try {
      const callbackUrl = `${config.APP_ORIGIN.replace(/\/$/, '')}/billing/return`;
      const data = await paystack<PaystackInitData>('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          ...(price.paystackPlanCode ? {} : { amount: price.amountMinor }),
          currency: price.currency,
          reference,
          callback_url: callbackUrl,
          ...(price.paystackPlanCode ? { plan: price.paystackPlanCode } : {}),
          metadata: {
            paymentId: created.payment.id,
            subscriptionId: created.subscription?.id ?? null,
            planId: plan.id,
            userId: owner.userId,
            orgId: owner.orgId,
          },
        }),
      });
      const checkoutHost = new URL(data.authorization_url).hostname;
      if (data.reference !== reference || !checkoutHost.endsWith('paystack.com')) {
        throw httpError(502, 'INVALID_PROVIDER_RESPONSE', 'The payment provider returned an unexpected checkout response.');
      }
      await prisma.payment.update({
        where: { id: created.payment.id },
        data: { status: 'PENDING', authorizationUrl: data.authorization_url },
      });
      await audit(req, { action: 'billing.checkout_initialized', actorId: user.id, orgId: user.orgId, targetType: 'payment', targetId: created.payment.id, meta: { provider: 'PAYSTACK', currency: price.currency, amountMinor: price.amountMinor } });
      return reply.code(201).send({
        paymentId: created.payment.id,
        subscriptionId: created.subscription?.id ?? null,
        reference,
        authorizationUrl: data.authorization_url,
        amountMinor: price.amountMinor,
        currency: price.currency,
      });
    } catch (err) {
      await prisma.payment.update({ where: { id: created.payment.id }, data: { status: 'FAILED', failureReason: 'Provider initialization failed.' } });
      if (created.subscription) await prisma.subscription.update({ where: { id: created.subscription.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
      throw err;
    }
  });

  app.get<{ Params: { reference: string } }>('/billing/verify/:reference', { preHandler: requirePermission('billing:read') }, async (req) => {
    const reference = z.string().min(5).max(100).parse(req.params.reference);
    const payment = await prisma.payment.findUnique({
      where: { providerReference: reference },
      include: { subscription: true },
    });
    if (!payment) throw httpError(404, 'PAYMENT_NOT_FOUND', 'Payment reference was not found.');
    const user = req.auth!.user;
    const belongs = payment.subscription
      ? (payment.subscription.orgId ? payment.subscription.orgId === user.orgId : payment.subscription.userId === user.id)
      : (() => {
          const m = payment.metadata as Record<string, unknown> | null;
          return m?.orgId ? m.orgId === user.orgId : m?.userId === user.id;
        })();
    if (!belongs) throw httpError(403, 'FORBIDDEN', 'You cannot view this payment.');
    const verified = await paystack<PaystackVerifyData>(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (verified.status === 'success') await applySuccessfulCharge(verified);
    else if (['failed', 'abandoned'].includes(verified.status)) {
      await prisma.payment.updateMany({ where: { id: payment.id, status: { not: 'SUCCEEDED' } }, data: { status: 'FAILED', failureReason: `Paystack status: ${verified.status}` } });
    }
    const refreshed = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    return { reference, status: refreshed.status.toLowerCase(), paidAt: refreshed.paidAt };
  });

  app.post('/billing/webhooks/paystack', async (req, reply) => {
    if (!config.PAYSTACK_ENABLED) return reply.code(503).send({ status: 'disabled' });
    if (!signatureIsValid(req.rawBody ?? Buffer.alloc(0), req.headers['x-paystack-signature'] as string | undefined)) {
      return reply.code(401).send({ code: 'INVALID_SIGNATURE' });
    }
    const event = z.object({
      event: z.string().min(1),
      data: z.unknown(),
    }).parse(req.body);
    // Some Paystack events (for example subscription.expiring_cards) contain an array.
    // Accept and record unknown event shapes, while processing only the typed events below.
    const data = event.data && typeof event.data === 'object' && !Array.isArray(event.data)
      ? event.data as PaystackWebhookData
      : null;
    const resourceId = data?.id ?? data?.reference ?? data?.invoice_code ?? data?.subscription_code ??
      data?.subscription?.subscription_code ?? createHash('sha256').update(req.rawBody ?? Buffer.alloc(0)).digest('hex');
    const eventId = `${event.event}:${String(resourceId)}`;

    try {
      await prisma.$transaction(async (tx) => {
        const safeData = data
          ? {
              ...data,
              ...(data.email_token ? { email_token: '[REDACTED]' } : {}),
              ...(data.subscription
                ? { subscription: { ...data.subscription, email_token: data.subscription.email_token ? '[REDACTED]' : null } }
                : {}),
            }
          : event.data;
        const safeEvent = { event: event.event, data: safeData };
        await tx.paymentEvent.create({
          data: {
            provider: 'PAYSTACK', eventId, eventType: event.event,
            payload: safeEvent as unknown as Prisma.InputJsonValue,
          },
        });
        if (data && event.event === 'charge.success' && data.reference && data.status === 'success' &&
            data.amount !== undefined && data.currency) {
          // Apply the payment and entitlement in the same database transaction as event de-duplication.
          let payment = await tx.payment.findUnique({
            where: { providerReference: data.reference },
            include: { subscription: true },
          });
          // Paystack creates a new transaction reference for each automatic renewal.
          // Persist that charge as a new Payment row linked to the existing Subscription.
          if (!payment && data.subscription?.subscription_code) {
            const recurringSub = await tx.subscription.findFirst({
              where: { provider: 'PAYSTACK', providerSubscriptionCode: data.subscription.subscription_code },
            });
            if (recurringSub) {
              payment = await tx.payment.create({
                data: {
                  subscriptionId: recurringSub.id, provider: 'PAYSTACK',
                  providerReference: data.reference, amountMinor: data.amount,
                  currency: data.currency, status: 'PENDING',
                },
                include: { subscription: true },
              });
            }
          }
          if (payment && payment.status !== 'SUCCEEDED' &&
              payment.amountMinor === data.amount && payment.currency === data.currency) {
            const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
            await tx.payment.update({ where: { id: payment.id }, data: { status: 'SUCCEEDED', paidAt } });
            let sub = payment.subscription;
            if (sub) {
              const end = periodEnd(paidAt, sub.interval);
              sub = await tx.subscription.update({
                where: { id: sub.id },
                data: {
                  status: 'ACTIVE', currentPeriodStart: paidAt, currentPeriodEnd: data.subscription?.next_payment_date ? new Date(data.subscription.next_payment_date) : end, gracePeriodEnd: null,
                  providerCustomerCode: data.customer?.customer_code,
                  providerSubscriptionCode: data.subscription?.subscription_code,
                  providerEmailToken: data.subscription?.email_token ? encryptSecret(data.subscription.email_token) : undefined,
                },
              });
            }
            const metadata = payment.metadata as Record<string, unknown> | null;
            const owner = sub ? { orgId: sub.orgId, userId: sub.userId } : {
              orgId: typeof metadata?.orgId === 'string' ? metadata.orgId : null,
              userId: typeof metadata?.userId === 'string' ? metadata.userId : null,
            };
            const planId = sub?.planId ?? (typeof metadata?.planId === 'string' ? metadata.planId : null);
            if (planId && (!!owner.orgId !== !!owner.userId)) {
              const plan = await tx.plan.findUnique({ where: { id: planId } });
              if (plan) {
                const entitlementData = {
                  ...owner, productId: plan.productId, planId: plan.id, status: 'ACTIVE' as const, source: 'PAYMENT' as const,
                  paymentId: payment.id, subscriptionId: sub?.id ?? null, startsAt: paidAt, expiresAt: sub?.currentPeriodEnd ?? null,
                };
                if (sub) {
                  await tx.entitlement.upsert({
                    where: { subscriptionId: sub.id },
                    create: entitlementData,
                    update: { status: 'ACTIVE', paymentId: payment.id, startsAt: paidAt, expiresAt: sub.currentPeriodEnd },
                  });
                } else {
                  await tx.entitlement.upsert({
                    where: { paymentId: payment.id },
                    create: entitlementData,
                    update: { status: 'ACTIVE', startsAt: paidAt, expiresAt: null },
                  });
                }
              }
            }
          }
        } else if (data && event.event === 'subscription.create') {
          const code = data.subscription_code ?? data.subscription?.subscription_code;
          const planCode = data.plan?.plan_code;
          const email = data.customer?.email?.toLowerCase();
          if (code && planCode && email) {
            const [price, customerUser] = await Promise.all([
              tx.planPrice.findFirst({
                where: { provider: 'PAYSTACK', paystackPlanCode: planCode, isActive: true },
                include: { plan: true },
              }),
              tx.user.findUnique({ where: { email }, select: { id: true, orgId: true } }),
            ]);
            if (price && customerUser) {
              const ownerFilter = customerUser.orgId
                ? { orgId: customerUser.orgId }
                : { userId: customerUser.id };
              const pending = await tx.subscription.findFirst({
                where: {
                  ...ownerFilter, customerEmail: email, planId: price.planId, provider: 'PAYSTACK',
                  providerSubscriptionCode: null, status: { in: ['PENDING', 'ACTIVE'] },
                },
                orderBy: { createdAt: 'desc' },
              });
              if (pending) {
                await tx.subscription.update({
                  where: { id: pending.id },
                  data: {
                    providerSubscriptionCode: code,
                    providerCustomerCode: data.customer?.customer_code,
                    providerEmailToken: (data.email_token ?? data.subscription?.email_token) ? encryptSecret((data.email_token ?? data.subscription?.email_token)!) : undefined,
                    currentPeriodEnd: (data.next_payment_date ?? data.subscription?.next_payment_date) ? new Date((data.next_payment_date ?? data.subscription?.next_payment_date)!) : undefined,
                  },
                });
              }
            }
          }
        } else if (data && (event.event === 'subscription.not_renew' || event.event === 'subscription.disable')) {
          const code = data.subscription_code ?? data.subscription?.subscription_code;
          if (code) {
            await tx.subscription.updateMany({
              where: { provider: 'PAYSTACK', providerSubscriptionCode: code },
              data: event.event === 'subscription.not_renew'
                ? { cancelAtPeriodEnd: true }
                : { status: 'CANCELLED', cancelAtPeriodEnd: true, cancelledAt: new Date() },
            });
          }
        } else if (data && (event.event === 'charge.failed' || event.event === 'invoice.payment_failed')) {
          const subscriptionCode = data.subscription?.subscription_code ?? data.subscription_code;
          const failedPayment = data.reference
            ? await tx.payment.findUnique({ where: { providerReference: data.reference }, select: { id: true, subscriptionId: true } })
            : null;
          const recurringSub = !failedPayment && subscriptionCode
            ? await tx.subscription.findFirst({ where: { provider: 'PAYSTACK', providerSubscriptionCode: subscriptionCode } })
            : null;
          if (data.reference) {
            if (failedPayment) {
              await tx.payment.updateMany({
                where: { providerReference: data.reference, status: { not: 'SUCCEEDED' } },
                data: { status: 'FAILED', failureReason: 'Paystack charge failed.' },
              });
            } else if (recurringSub && data.amount !== undefined && data.currency) {
              await tx.payment.create({
                data: {
                  subscriptionId: recurringSub.id, provider: 'PAYSTACK',
                  providerReference: data.reference, amountMinor: data.amount,
                  currency: data.currency, status: 'FAILED', failureReason: 'Paystack charge failed.',
                },
              });
            }
          } else if (recurringSub && data.invoice_code) {
            await tx.payment.create({
              data: {
                subscriptionId: recurringSub.id, provider: 'PAYSTACK',
                providerReference: `invoice_${data.invoice_code}`,
                amountMinor: data.amount ?? recurringSub.amountMinor,
                currency: data.currency ?? recurringSub.currency,
                status: 'FAILED', failureReason: 'Paystack subscription invoice payment failed.',
              },
            });
          }
          const subscriptionId = failedPayment?.subscriptionId ?? recurringSub?.id;
          if (subscriptionId) {
            const graceEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
            await tx.subscription.update({
              where: { id: subscriptionId },
              data: { status: 'PAST_DUE', gracePeriodEnd: graceEnd },
            });
            await tx.entitlement.updateMany({
              where: { subscriptionId, status: 'ACTIVE' },
              data: { expiresAt: graceEnd },
            });
          }
        }
        await tx.paymentEvent.update({
          where: { provider_eventId: { provider: 'PAYSTACK', eventId } },
          data: { processedAt: new Date() },
        });
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return reply.code(200).send({ received: true, duplicate: true });
      }
      throw err;
    }
    return reply.code(200).send({ received: true });
  });

  app.get<{ Params: { id: string } }>('/billing/subscriptions/:id/manage-link', { preHandler: requirePermission('billing:manage') }, async (req) => {
    const subscription = await prisma.subscription.findUnique({ where: { id: req.params.id } });
    if (!subscription) throw httpError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found.');
    const user = req.auth!.user;
    const owns = subscription.orgId ? subscription.orgId === user.orgId : subscription.userId === user.id;
    if (!owns) throw httpError(403, 'FORBIDDEN', 'You cannot manage this subscription.');
    if (subscription.provider !== 'PAYSTACK' || !subscription.providerSubscriptionCode) {
      throw httpError(409, 'SUBSCRIPTION_NOT_READY', 'The payment provider has not supplied a subscription management link yet.');
    }
    const result = await paystack<{ link: string }>(`/subscription/${encodeURIComponent(subscription.providerSubscriptionCode)}/manage/link`);
    return { url: result.link };
  });

  app.post<{ Params: { id: string } }>('/billing/subscriptions/:id/resume', { preHandler: requirePermission('billing:manage') }, async (req) => {
    const subscription = await prisma.subscription.findUnique({ where: { id: req.params.id } });
    if (!subscription) throw httpError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found.');
    const user = req.auth!.user;
    const owns = subscription.orgId ? subscription.orgId === user.orgId : subscription.userId === user.id;
    if (!owns) throw httpError(403, 'FORBIDDEN', 'You cannot manage this subscription.');
    if (subscription.status !== 'PAST_DUE' || subscription.provider !== 'PAYSTACK') {
      throw httpError(409, 'SUBSCRIPTION_NOT_RESUMABLE', 'Only a past-due Paystack subscription can be resumed.');
    }
    if (!subscription.providerSubscriptionCode || !subscription.providerEmailToken) {
      throw httpError(409, 'SUBSCRIPTION_NOT_READY', 'The payment provider has not supplied the subscription recovery credentials yet.');
    }
    const code = subscription.providerSubscriptionCode;
    await paystack('/subscription/enable', {
      method: 'POST',
      body: JSON.stringify({ code, token: decryptSecret(subscription.providerEmailToken) }),
    });
    const remote = await paystack<{ status: string; next_payment_date?: string }>(`/subscription/${encodeURIComponent(code)}`);
    if (remote.status !== 'active') {
      throw httpError(409, 'SUBSCRIPTION_NOT_ACTIVE', 'Paystack has not confirmed that this subscription is active.');
    }
    const nextPayment = remote.next_payment_date ? new Date(remote.next_payment_date) : periodEnd(new Date(), subscription.interval);
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE', gracePeriodEnd: null, currentPeriodEnd: nextPayment },
      });
      await tx.entitlement.updateMany({
        where: { subscriptionId: subscription.id },
        data: { status: 'ACTIVE', expiresAt: nextPayment },
      });
    });
    await audit(req, { action: 'billing.subscription_resumed', actorId: user.id, orgId: user.orgId, targetType: 'subscription', targetId: subscription.id });
    return { id: subscription.id, status: 'active', currentPeriodEnd: nextPayment };
  });

  app.post<{ Params: { id: string } }>('/billing/subscriptions/:id/cancel', { preHandler: requirePermission('billing:manage') }, async (req) => {
    const subscription = await prisma.subscription.findUnique({ where: { id: req.params.id } });
    if (!subscription) throw httpError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found.');
    const user = req.auth!.user;
    const owns = subscription.orgId ? subscription.orgId === user.orgId : subscription.userId === user.id;
    if (!owns) throw httpError(403, 'FORBIDDEN', 'You cannot manage this subscription.');
    if (subscription.status === 'CANCELLED' || subscription.status === 'EXPIRED') {
      return { id: subscription.id, status: subscription.status.toLowerCase(), cancelAtPeriodEnd: true };
    }
    if (subscription.provider === 'PAYSTACK') {
      if (!subscription.providerSubscriptionCode || !subscription.providerEmailToken) {
        throw httpError(409, 'CANCELLATION_NOT_READY', 'The payment provider has not supplied the subscription cancellation credentials yet.');
      }
      await paystack('/subscription/disable', {
        method: 'POST',
        body: JSON.stringify({ code: subscription.providerSubscriptionCode, token: decryptSecret(subscription.providerEmailToken) }),
      });
    } else {
      throw httpError(503, 'PROVIDER_DISABLED', 'This payment provider is not enabled.');
    }
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELLED', cancelAtPeriodEnd: true, cancelledAt: new Date() },
    });
    await audit(req, { action: 'billing.subscription_cancelled', actorId: user.id, orgId: user.orgId, targetType: 'subscription', targetId: subscription.id });
    return { id: updated.id, status: 'cancelled', accessUntil: updated.currentPeriodEnd, cancelAtPeriodEnd: true };
  });

  app.get('/billing/me', { preHandler: requirePermission('billing:read') }, async (req) => {
    const { user } = req.auth!;
    const ownerWhere = user.orgId ? { orgId: user.orgId } : { userId: user.id };
    const [subscriptions, payments] = await Promise.all([
      prisma.subscription.findMany({
        where: ownerWhere,
        include: { plan: { include: { product: { select: { name: true, slug: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.payment.findMany({
        where: {
          OR: [
            { subscription: ownerWhere },
            { metadata: { path: user.orgId ? ['orgId'] : ['userId'], equals: user.orgId ?? user.id } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    return {
      subscriptions: subscriptions.map((s) => ({
        id: s.id, product: s.plan.product.name, plan: s.plan.name, status: s.status.toLowerCase(),
        currency: s.currency, amountMinor: s.amountMinor, interval: s.interval.toLowerCase(),
        currentPeriodEnd: s.currentPeriodEnd, cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      })),
      payments: payments.map((p) => ({
        id: p.id, reference: p.providerReference, status: p.status.toLowerCase(),
        amountMinor: p.amountMinor, currency: p.currency, paidAt: p.paidAt, createdAt: p.createdAt,
      })),
    };
  });
}
