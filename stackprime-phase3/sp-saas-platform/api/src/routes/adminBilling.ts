import type { FastifyInstance } from 'fastify';
import { Prisma, type PurchaseOrderStatus } from '@prisma/client';
import { z } from 'zod';
import { audit } from '../lib/audit.js';
import { prisma } from '../lib/db.js';
import { httpError } from '../lib/errors.js';
import { createPlan } from '../lib/paystack.js';
import { requireStaff } from '../plugins/authenticate.js';

// StackPrime staff only: prices, purchase orders (the invoice path), manual access grants.
const limit = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });
const staff = (max = 60) => ({ preHandler: requireStaff, config: limit(max) });
const currency = z.string().trim().regex(/^[A-Za-z]{3}$/, 'Use a 3-letter currency code.').transform((s) => s.toUpperCase());
const futureDate = z.coerce.date().refine((d) => d.getTime() > Date.now(), 'Must be a date in the future.');

const priceView = (plan: { billingModel: string }, p: { currency: string; amountMinor: number; providerPlanCode: string | null; isActive: boolean }) => ({
  currency: p.currency,
  amountMinor: p.amountMinor,
  isActive: p.isActive,
  hasProviderPlan: p.providerPlanCode !== null,
  purchasable: p.isActive && (plan.billingModel === 'PERPETUAL' || p.providerPlanCode !== null),
});

export default async function adminBillingRoutes(app: FastifyInstance) {
  // ── prices (one per plan per currency) ──
  app.put<{ Params: { id: string; currency: string } }>('/plans/:id/prices/:currency', staff(30), async (req) => {
    const cur = currency.parse(req.params.currency);
    const body = z.object({ amountMinor: z.number().int().min(1).max(1_000_000_000), isActive: z.boolean().optional() }).parse(req.body);
    const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) throw httpError(404, 'NOT_FOUND', 'Plan not found.');

    const key = { planId_currency: { planId: plan.id, currency: cur } };
    const existing = await prisma.planPrice.findUnique({ where: key });
    // A changed amount no longer matches the provider plan, so detach it: a new one must be created.
    const detach = existing !== null && existing.amountMinor !== body.amountMinor;
    const price = await prisma.planPrice.upsert({
      where: key,
      create: { planId: plan.id, currency: cur, amountMinor: body.amountMinor, isActive: body.isActive ?? true },
      update: { amountMinor: body.amountMinor, ...(body.isActive !== undefined ? { isActive: body.isActive } : {}), ...(detach ? { providerPlanCode: null } : {}) },
    });
    await audit(req, { action: 'catalog.price_set', actorId: req.auth!.user.id, targetType: 'plan', targetId: plan.id, meta: { currency: cur, amountMinor: body.amountMinor } });
    return priceView(plan, price);
  });

  // Creates the matching plan on Paystack and stores its code, so nobody has to copy codes by hand.
  app.post<{ Params: { id: string; currency: string } }>('/plans/:id/prices/:currency/paystack-plan', staff(10), async (req) => {
    const cur = currency.parse(req.params.currency);
    const plan = await prisma.plan.findUnique({ where: { id: req.params.id }, include: { product: true } });
    if (!plan) throw httpError(404, 'NOT_FOUND', 'Plan not found.');
    if (plan.billingModel !== 'SUBSCRIPTION') throw httpError(409, 'NOT_A_SUBSCRIPTION', 'Only subscription plans need a Paystack plan.');
    const price = await prisma.planPrice.findUnique({ where: { planId_currency: { planId: plan.id, currency: cur } } });
    if (!price) throw httpError(404, 'NOT_FOUND', 'Set a price in that currency first.');
    if (price.providerPlanCode) throw httpError(409, 'ALREADY_SYNCED', 'This price already has a Paystack plan. Change the amount to create a new one.');
    if (plan.interval === 'ONE_TIME') throw httpError(409, 'NOT_A_SUBSCRIPTION', 'A one-time plan has no billing interval.');

    const created = await createPlan({
      name: `${plan.product.name} - ${plan.name} (${cur})`,
      interval: plan.interval === 'MONTH' ? 'monthly' : 'annually',
      amount: price.amountMinor,
      currency: cur,
    });
    const updated = await prisma.planPrice.update({ where: { id: price.id }, data: { providerPlanCode: created.plan_code } });
    await audit(req, { action: 'catalog.paystack_plan_created', actorId: req.auth!.user.id, targetType: 'plan', targetId: plan.id, meta: { currency: cur } });
    return priceView(plan, updated);
  });

  // ── purchase orders: the invoice path, handled by a person ──
  app.get('/purchase-orders', staff(60), async (req) => {
    const { status } = z.object({ status: z.enum(['REQUESTED', 'INVOICED', 'PAID', 'REJECTED']).optional() }).parse(req.query);
    const rows = await prisma.purchaseOrder.findMany({
      where: status ? { status } : {},
      include: { org: { select: { name: true } }, product: { select: { name: true } }, plan: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return {
      purchaseOrders: rows.map((r) => ({ id: r.id, status: r.status, org: r.org.name, orgId: r.orgId, product: r.product.name, plan: r.plan.name, quantity: r.quantity, reference: r.reference, notes: r.notes, createdAt: r.createdAt })),
    };
  });

  app.post<{ Params: { id: string } }>('/purchase-orders/:id/status', staff(30), async (req) => {
    const { status } = z.object({ status: z.enum(['INVOICED', 'REJECTED']) }).parse(req.body);
    const from: PurchaseOrderStatus[] = status === 'INVOICED' ? ['REQUESTED'] : ['REQUESTED', 'INVOICED'];
    const r = await prisma.purchaseOrder.updateMany({ where: { id: req.params.id, status: { in: from } }, data: { status } });
    if (r.count !== 1) throw httpError(409, 'INVALID_STATE', 'That purchase order cannot move to that status.');
    await audit(req, { action: `billing.po_${status.toLowerCase()}`, actorId: req.auth!.user.id, targetType: 'purchase_order', targetId: req.params.id });
    return { id: req.params.id, status };
  });

  // Payment received: turns the order into access. expiresAt is the end of the paid period.
  app.post<{ Params: { id: string } }>('/purchase-orders/:id/activate', staff(30), async (req) => {
    const body = z.object({ expiresAt: futureDate, endpointLimit: z.number().int().min(1).max(1_000_000).optional() }).parse(req.body);
    const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!po) throw httpError(404, 'NOT_FOUND', 'Purchase order not found.');

    const entitlement = await prisma.$transaction(async (tx) => {
      const claimed = await tx.purchaseOrder.updateMany({ where: { id: po.id, status: { in: ['REQUESTED', 'INVOICED'] } }, data: { status: 'PAID' } });
      if (claimed.count !== 1) throw httpError(409, 'INVALID_STATE', 'That purchase order cannot be activated.');
      return tx.entitlement.create({
        data: {
          orgId: po.orgId,
          productId: po.productId,
          planId: po.planId,
          status: 'ACTIVE',
          source: 'PO_INVOICE',
          endpointLimit: body.endpointLimit ?? po.quantity,
          startsAt: new Date(),
          expiresAt: body.expiresAt,
        },
      });
    });
    await audit(req, { action: 'billing.po_activated', actorId: req.auth!.user.id, orgId: po.orgId, targetType: 'entitlement', targetId: entitlement.id, meta: { purchaseOrder: po.id, expiresAt: body.expiresAt.toISOString() } });
    return { entitlementId: entitlement.id, endpointLimit: entitlement.endpointLimit, expiresAt: entitlement.expiresAt };
  });

  // ── manual grants and revocations (trials, goodwill, support fixes). A reason is mandatory. ──
  app.post('/entitlements', staff(20), async (req, reply) => {
    const body = z
      .object({
        orgId: z.string().optional(),
        userId: z.string().optional(),
        productSlug: z.string().min(1).max(100),
        planCode: z.string().min(1).max(100),
        expiresAt: futureDate.optional(),
        endpointLimit: z.number().int().min(1).max(1_000_000).optional(),
        reason: z.string().trim().min(5).max(500),
      })
      .refine((b) => (b.orgId ? 1 : 0) + (b.userId ? 1 : 0) === 1, 'Give exactly one of orgId or userId.')
      .parse(req.body);

    const plan = await prisma.plan.findFirst({ where: { code: body.planCode, product: { slug: body.productSlug } } });
    if (!plan) throw httpError(404, 'NOT_FOUND', 'Plan not found.');
    if (body.orgId && !(await prisma.org.findUnique({ where: { id: body.orgId }, select: { id: true } }))) throw httpError(404, 'NOT_FOUND', 'Organisation not found.');
    if (body.userId && !(await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } }))) throw httpError(404, 'NOT_FOUND', 'User not found.');

    const e = await prisma.entitlement.create({
      data: {
        orgId: body.orgId,
        userId: body.userId,
        productId: plan.productId,
        planId: plan.id,
        status: 'ACTIVE',
        source: 'MANUAL',
        endpointLimit: body.endpointLimit,
        expiresAt: body.expiresAt,
      },
    });
    await audit(req, { action: 'billing.entitlement_granted_manually', actorId: req.auth!.user.id, orgId: body.orgId, targetType: 'entitlement', targetId: e.id, meta: { reason: body.reason } });
    return reply.code(201).send({ id: e.id });
  });

  app.post<{ Params: { id: string } }>('/entitlements/:id/revoke', staff(20), async (req) => {
    const { reason } = z.object({ reason: z.string().trim().min(5).max(500) }).parse(req.body);
    const e = await prisma.entitlement.findUnique({ where: { id: req.params.id } });
    if (!e) throw httpError(404, 'NOT_FOUND', 'Entitlement not found.');
    const r = await prisma.entitlement.updateMany({ where: { id: e.id, status: { in: ['ACTIVE', 'PENDING'] } }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    if (r.count !== 1) throw httpError(409, 'INVALID_STATE', 'That entitlement is already inactive.');
    await audit(req, { action: 'billing.entitlement_revoked', actorId: req.auth!.user.id, orgId: e.orgId, targetType: 'entitlement', targetId: e.id, meta: { reason } });
    return { id: e.id, status: 'CANCELLED' };
  });
}
