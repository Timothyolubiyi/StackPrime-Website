import { randomBytes } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { Prisma, type Payment, type Plan } from '@prisma/client';
import { audit } from './audit.js';
import { prisma } from './db.js';
import { GRACE_DAYS, expiryFor } from './entitlements.js';
import { httpError } from './errors.js';
import { paymentFailedMail, sendMail } from './mail.js';
import type { PaystackCharge } from './paystack.js';

// All the rules for turning Paystack events into entitlements live here. Every function is safe to
// run twice with the same input: Paystack retries webhooks for up to 72 hours, and the customer's
// browser may also trigger a verify at the same moment as the webhook arrives.

export type ChargeOutcome = 'granted' | 'renewed' | 'duplicate' | 'flagged' | 'unmatched';

const DAY_MS = 24 * 60 * 60 * 1000;
const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
const newLicenseKey = () => `SP-${randomBytes(6).toString('hex').toUpperCase()}`;

/** charge.success, or a verified transaction: the first payment of a purchase, or a subscription renewal. */
export async function applySuccessfulCharge(charge: PaystackCharge, req: FastifyRequest | null): Promise<{ outcome: ChargeOutcome; entitlementId?: string }> {
  const payment = await prisma.payment.findUnique({ where: { reference: charge.reference }, include: { plan: true } });
  if (payment) return settleFirstPayment(payment, charge, req);
  if (charge.plan?.plan_code) return settleRenewal(charge, req);
  await audit(req, { action: 'billing.charge_unmatched', targetType: 'payment', targetId: charge.reference });
  return { outcome: 'unmatched' };
}

async function settleFirstPayment(payment: Payment & { plan: Plan }, charge: PaystackCharge, req: FastifyRequest | null) {
  if (payment.status === 'SUCCEEDED') return { outcome: 'duplicate' as const, entitlementId: payment.entitlementId ?? undefined };

  // Never trust the browser or the metadata: the amount actually charged must match what we asked for.
  if (charge.amount !== payment.amountMinor || String(charge.currency).toUpperCase() !== payment.currency) {
    await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'FLAGGED', providerTransactionId: String(charge.id ?? '') } });
    await audit(req, {
      action: 'billing.payment_flagged',
      orgId: payment.orgId,
      actorId: payment.userId,
      targetType: 'payment',
      targetId: payment.id,
      meta: { expected: `${payment.amountMinor} ${payment.currency}`, received: `${charge.amount} ${charge.currency}` },
    });
    return { outcome: 'flagged' as const };
  }

  const now = new Date();
  const entitlementId = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'SUCCEEDED', paidAt: now, providerTransactionId: String(charge.id ?? '') },
    });
    if (claimed.count !== 1) return null; // another request settled it first
    const e = await tx.entitlement.create({
      data: {
        orgId: payment.orgId,
        userId: payment.userId,
        productId: payment.plan.productId,
        planId: payment.plan.id,
        status: 'ACTIVE',
        source: 'PAYSTACK',
        provider: 'PAYSTACK',
        providerCustomerCode: charge.customer?.customer_code,
        providerPlanCode: payment.providerPlanCode,
        startsAt: now,
        expiresAt: payment.plan.billingModel === 'SUBSCRIPTION' ? expiryFor(payment.plan.interval, now) : null,
        licenseKey: payment.plan.billingModel === 'PERPETUAL' ? newLicenseKey() : null,
      },
    });
    await tx.payment.update({ where: { id: payment.id }, data: { entitlementId: e.id } });
    return e.id;
  });
  if (!entitlementId) return { outcome: 'duplicate' as const };

  await audit(req, { action: 'billing.entitlement_granted', orgId: payment.orgId, actorId: payment.userId, targetType: 'entitlement', targetId: entitlementId, meta: { via: 'paystack', reference: payment.reference } });
  return { outcome: 'granted' as const, entitlementId };
}

// Renewals arrive as a charge.success carrying the plan, with a reference we did not create.
async function settleRenewal(charge: PaystackCharge, req: FastifyRequest | null) {
  const customerCode = charge.customer?.customer_code;
  const planCode = charge.plan?.plan_code;
  const entitlement =
    customerCode && planCode
      ? await prisma.entitlement.findFirst({
          where: { provider: 'PAYSTACK', providerCustomerCode: customerCode, providerPlanCode: planCode },
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        })
      : null;
  if (!entitlement) {
    await audit(req, { action: 'billing.renewal_unmatched', targetType: 'payment', targetId: charge.reference, meta: { customerCode: customerCode ?? null, planCode: planCode ?? null } });
    return { outcome: 'unmatched' as const };
  }

  const now = new Date();
  try {
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          provider: 'PAYSTACK',
          reference: charge.reference, // unique: a replayed event fails here and is treated as a duplicate
          orgId: entitlement.orgId,
          userId: entitlement.userId,
          planId: entitlement.planId,
          currency: String(charge.currency).toUpperCase(),
          amountMinor: charge.amount,
          providerPlanCode: planCode,
          status: 'SUCCEEDED',
          providerTransactionId: String(charge.id ?? ''),
          entitlementId: entitlement.id,
          paidAt: now,
        },
      }),
      prisma.entitlement.update({
        where: { id: entitlement.id },
        data: { status: 'ACTIVE', expiresAt: expiryFor(entitlement.plan.interval, now) },
      }),
    ]);
  } catch (err) {
    if (isUniqueViolation(err)) return { outcome: 'duplicate' as const, entitlementId: entitlement.id };
    throw err;
  }
  await audit(req, { action: 'billing.subscription_renewed', orgId: entitlement.orgId, actorId: entitlement.userId, targetType: 'entitlement', targetId: entitlement.id, meta: { reference: charge.reference } });
  return { outcome: 'renewed' as const, entitlementId: entitlement.id };
}

interface SubscriptionData {
  subscription_code?: string;
  email_token?: string;
  next_payment_date?: string;
  plan?: { plan_code?: string } | null;
  customer?: { customer_code?: string; email?: string } | null;
  subscription?: { subscription_code?: string } | null; // present on invoice events
}

async function onSubscriptionCreate(data: SubscriptionData, req: FastifyRequest | null) {
  const code = data.subscription_code;
  if (!code) return;
  if (await prisma.entitlement.findUnique({ where: { providerSubscriptionCode: code }, select: { id: true } })) return; // already linked

  const customerCode = data.customer?.customer_code;
  const planCode = data.plan?.plan_code;
  if (!customerCode || !planCode) return; // not enough to match (an undefined filter would match everything)

  const entitlement = await prisma.entitlement.findFirst({
    where: { provider: 'PAYSTACK', providerCustomerCode: customerCode, providerPlanCode: planCode, providerSubscriptionCode: null },
    orderBy: { createdAt: 'desc' },
  });
  // Paystack does not guarantee the order of events. If the payment has not been recorded yet, answer
  // with an error: Paystack retries in a few minutes and by then the charge will have been processed.
  if (!entitlement) throw httpError(503, 'NOT_READY', 'Subscription arrived before its payment; retry later.');

  const next = data.next_payment_date ? new Date(data.next_payment_date) : null;
  await prisma.entitlement.update({
    where: { id: entitlement.id },
    data: {
      providerSubscriptionCode: code,
      providerEmailToken: data.email_token,
      nextPaymentAt: next,
      ...(next ? { expiresAt: new Date(next.getTime() + GRACE_DAYS * DAY_MS) } : {}),
    },
  });
  await audit(req, { action: 'billing.subscription_linked', orgId: entitlement.orgId, actorId: entitlement.userId, targetType: 'entitlement', targetId: entitlement.id });
}

async function onSubscriptionEnding(data: SubscriptionData, disabled: boolean, req: FastifyRequest | null) {
  const code = data.subscription_code ?? data.subscription?.subscription_code;
  if (!code) return;
  const e = await prisma.entitlement.findUnique({ where: { providerSubscriptionCode: code } });
  if (!e) return;
  await prisma.entitlement.update({
    where: { id: e.id },
    data: { cancelledAt: e.cancelledAt ?? new Date(), ...(disabled ? { status: 'CANCELLED' } : {}) },
  });
  await audit(req, { action: disabled ? 'billing.subscription_disabled' : 'billing.subscription_not_renewing', orgId: e.orgId, actorId: e.userId, targetType: 'entitlement', targetId: e.id });
}

async function onPaymentFailed(data: SubscriptionData, req: FastifyRequest | null) {
  const code = data.subscription?.subscription_code ?? data.subscription_code;
  const e = code
    ? await prisma.entitlement.findUnique({ where: { providerSubscriptionCode: code }, include: { product: true } })
    : null;
  await audit(req, { action: 'billing.payment_failed', orgId: e?.orgId, actorId: e?.userId, targetType: 'entitlement', targetId: e?.id, meta: { subscription: code ?? null } });
  const to = data.customer?.email;
  if (e && to) await sendMail(paymentFailedMail(to, e.product.name)).catch(() => undefined);
}

export async function handlePaystackEvent(evt: { event?: string; data?: unknown }, req: FastifyRequest | null): Promise<void> {
  const data = (evt.data ?? {}) as Record<string, unknown>;
  switch (evt.event) {
    case 'charge.success':
      await applySuccessfulCharge(data as unknown as PaystackCharge, req);
      break;
    case 'subscription.create':
      await onSubscriptionCreate(data as SubscriptionData, req);
      break;
    case 'subscription.not_renew':
      await onSubscriptionEnding(data as SubscriptionData, false, req);
      break;
    case 'subscription.disable':
      await onSubscriptionEnding(data as SubscriptionData, true, req);
      break;
    case 'invoice.payment_failed':
      await onPaymentFailed(data as SubscriptionData, req);
      break;
    default:
      break; // events we do not act on are acknowledged and ignored
  }
}
