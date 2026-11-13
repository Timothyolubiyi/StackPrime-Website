import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { audit } from '../lib/audit.js';
import { applySuccessfulCharge } from '../lib/billing.js';
import { prisma } from '../lib/db.js';
import { activeEntitlementWhere, entitlementState, ownerOf } from '../lib/entitlements.js';
import { httpError } from '../lib/errors.js';
import { purchaseOrderMail, sendMail } from '../lib/mail.js';
import { disableSubscription, initializeTransaction, subscriptionManageLink, verifyTransaction } from '../lib/paystack.js';
import { authenticate, requirePermission } from '../plugins/authenticate.js';

const limit = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });
const currency = z.string().trim().regex(/^[A-Za-z]{3}$/, 'Use a 3-letter currency code.').transform((s) => s.toUpperCase());
const slug = z.string().trim().min(1).max(100);

export default async function billingRoutes(app: FastifyInstance) {
  // ── start a purchase: returns the Paystack page to send the customer to ──
  app.post('/billing/checkout', { preHandler: requirePermission('billing:manage'), config: limit(10) }, async (req, reply) => {
    const body = z.object({ productSlug: slug, planCode: slug, currency }).parse(req.body);
    const user = req.auth!.user;

    const plan = await prisma.plan.findFirst({
      where: { code: body.planCode, isActive: true, product: { slug: body.productSlug, isActive: true } },
      include: { product: true, prices: { where: { currency: body.currency, isActive: true } } },
    });
    if (!plan) throw httpError(404, 'NOT_FOUND', 'Plan not found.');
    const price = plan.prices[0];
    if (!price || (plan.billingModel === 'SUBSCRIPTION' && !price.providerPlanCode)) {
      throw httpError(409, 'NOT_PURCHASABLE', 'This plan cannot be bought online in that currency yet. You can request an invoice instead.');
    }
    if (await prisma.entitlement.findFirst({ where: activeEntitlementWhere(user, plan.productId), select: { id: true } })) {
      throw httpError(409, 'ALREADY_ENTITLED', 'You already have access to this product.');
    }

    // Paystack references allow only letters, digits, "-", "." and "=".
    const reference = `sp-${randomBytes(16).toString('hex')}`;
    const providerPlanCode = plan.billingModel === 'SUBSCRIPTION' ? price.providerPlanCode : null;
    const payment = await prisma.payment.create({
      data: {
        provider: 'PAYSTACK',
        reference,
        ...ownerOf(user),
        planId: plan.id,
        currency: price.currency,
        amountMinor: price.amountMinor,
        providerPlanCode,
      },
    });

    try {
      const init = await initializeTransaction({
        email: user.email,
        amount: price.amountMinor,
        currency: price.currency,
        reference,
        callbackUrl: `${config.APP_ORIGIN}/billing/complete`,
        plan: providerPlanCode ?? undefined,
        metadata: { paymentId: payment.id, product: plan.product.slug, plan: plan.code },
      });
      await audit(req, { action: 'billing.checkout_started', actorId: user.id, orgId: user.orgId, targetType: 'payment', targetId: payment.id });
      return reply.code(201).send({ reference, authorizationUrl: init.authorization_url });
    } catch (err) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      throw err;
    }
  });

  // ── the customer is back from Paystack: confirm now instead of waiting for the webhook ──
  app.get('/billing/verify', { preHandler: requirePermission('billing:manage'), config: limit(30) }, async (req) => {
    const { reference } = z.object({ reference: z.string().min(5).max(100) }).parse(req.query);
    const user = req.auth!.user;
    const payment = await prisma.payment.findFirst({ where: { reference, ...ownerOf(user) } });
    if (!payment) throw httpError(404, 'NOT_FOUND', 'Payment not found.');

    if (payment.status === 'PENDING') {
      const charge = await verifyTransaction(reference);
      if (charge.status === 'success') await applySuccessfulCharge({ ...charge, reference }, req);
      else if (charge.status === 'failed') await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'FAILED' } });
    }
    const fresh = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    return { reference, status: fresh.status.toLowerCase(), entitlementId: fresh.entitlementId };
  });

  // ── what the signed-in person's account is entitled to ──
  app.get('/entitlements', { preHandler: authenticate }, async (req) => {
    const rows = await prisma.entitlement.findMany({
      where: ownerOf(req.auth!.user),
      include: { product: { select: { slug: true, name: true } }, plan: { select: { code: true, name: true, interval: true, endpointLimit: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    return {
      entitlements: rows.map((e) => ({
        id: e.id,
        product: e.product,
        plan: { code: e.plan.code, name: e.plan.name, interval: e.plan.interval.toLowerCase() },
        state: entitlementState(e, now),
        source: e.source.toLowerCase(),
        endpointLimit: e.endpointLimit ?? e.plan.endpointLimit,
        startsAt: e.startsAt,
        expiresAt: e.expiresAt,
        cancelledAt: e.cancelledAt,
        licenseKey: e.licenseKey, // only perpetual licences have one
      })),
    };
  });

  app.get('/billing/payments', { preHandler: requirePermission('billing:read') }, async (req) => {
    const rows = await prisma.payment.findMany({
      where: ownerOf(req.auth!.user),
      include: { plan: { select: { name: true, product: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      payments: rows.map((p) => ({
        reference: p.reference,
        status: p.status.toLowerCase(),
        product: p.plan.product.name,
        plan: p.plan.name,
        currency: p.currency,
        amountMinor: p.amountMinor,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      })),
    };
  });

  // ── cancel / update card: Paystack-billed subscriptions only ──
  app.post<{ Params: { id: string } }>('/billing/entitlements/:id/cancel', { preHandler: requirePermission('billing:manage'), config: limit(10) }, async (req) => {
    const user = req.auth!.user;
    const e = await prisma.entitlement.findFirst({ where: { id: req.params.id, ...ownerOf(user) } });
    if (!e) throw httpError(404, 'NOT_FOUND', 'Subscription not found.');
    if (!e.providerSubscriptionCode || !e.providerEmailToken) {
      throw httpError(409, 'NOT_CANCELLABLE_ONLINE', 'This plan is not billed by card. Contact support@stackprimeconsulting.com.ng to change it.');
    }
    if (e.cancelledAt) return { cancelledAt: e.cancelledAt, accessUntil: e.expiresAt };

    await disableSubscription(e.providerSubscriptionCode, e.providerEmailToken);
    const updated = await prisma.entitlement.update({ where: { id: e.id }, data: { cancelledAt: new Date() } });
    await audit(req, { action: 'billing.subscription_cancelled', actorId: user.id, orgId: user.orgId, targetType: 'entitlement', targetId: e.id });
    return { cancelledAt: updated.cancelledAt, accessUntil: updated.expiresAt }; // paid time is not taken away
  });

  app.get<{ Params: { id: string } }>('/billing/entitlements/:id/manage-link', { preHandler: requirePermission('billing:manage'), config: limit(10) }, async (req) => {
    const e = await prisma.entitlement.findFirst({ where: { id: req.params.id, ...ownerOf(req.auth!.user) } });
    if (!e?.providerSubscriptionCode) throw httpError(404, 'NOT_FOUND', 'Subscription not found.');
    const { link } = await subscriptionManageLink(e.providerSubscriptionCode);
    return { link };
  });

  // ── invoice / purchase-order path for organisations that cannot pay by card ──
  app.post('/billing/purchase-orders', { preHandler: requirePermission('billing:manage'), config: limit(5) }, async (req, reply) => {
    const body = z
      .object({
        productSlug: slug,
        planCode: slug,
        quantity: z.number().int().min(1).max(100_000),
        reference: z.string().trim().max(100).optional(),
        notes: z.string().trim().max(2000).optional(),
      })
      .parse(req.body);
    const user = req.auth!.user;
    if (!user.orgId) throw httpError(403, 'ORG_REQUIRED', 'Purchase orders are for organisations. Create or join one first.');

    const plan = await prisma.plan.findFirst({
      where: { code: body.planCode, isActive: true, product: { slug: body.productSlug, isActive: true } },
      include: { product: true },
    });
    if (!plan) throw httpError(404, 'NOT_FOUND', 'Plan not found.');
    const org = await prisma.org.findUniqueOrThrow({ where: { id: user.orgId }, select: { name: true } });

    const po = await prisma.purchaseOrder.create({
      data: { orgId: user.orgId, productId: plan.productId, planId: plan.id, quantity: body.quantity, reference: body.reference, notes: body.notes, requestedById: user.id },
    });
    let notified = true;
    try {
      await sendMail(purchaseOrderMail(config.ADMIN_NOTIFY_EMAIL, { id: po.id, org: org.name, product: plan.product.name, plan: plan.name, quantity: po.quantity, poRef: po.reference, notes: po.notes, requestedBy: user.email }));
    } catch (err) {
      notified = false;
      req.log.error({ err }, 'purchase order notification failed');
    }
    await audit(req, { action: 'billing.po_requested', actorId: user.id, orgId: user.orgId, targetType: 'purchase_order', targetId: po.id });
    return reply.code(201).send({ id: po.id, status: po.status.toLowerCase(), notified });
  });

  app.get('/billing/purchase-orders', { preHandler: requirePermission('billing:read') }, async (req) => {
    const user = req.auth!.user;
    if (!user.orgId) return { purchaseOrders: [] };
    const rows = await prisma.purchaseOrder.findMany({
      where: { orgId: user.orgId },
      include: { product: { select: { name: true } }, plan: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      purchaseOrders: rows.map((r) => ({ id: r.id, status: r.status.toLowerCase(), product: r.product.name, plan: r.plan.name, quantity: r.quantity, reference: r.reference, createdAt: r.createdAt })),
    };
  });
}
