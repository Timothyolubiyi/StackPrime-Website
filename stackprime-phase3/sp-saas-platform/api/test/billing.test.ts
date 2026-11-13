import { createHmac } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/db.js';
import { mailOutbox } from '../src/lib/mail.js';
import { redis } from '../src/lib/redis.js';
import { addMember, createStaff, createUser, type TestUser } from './helpers.js';

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

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
const call = (user: TestUser | null, method: Method, url: string, payload?: object) =>
  app.inject({ method, url, payload, headers: user ? user.headers : {} });
const rand = () => Math.random().toString(36).slice(2, 10);
const DAY = 24 * 60 * 60 * 1000;

// ── a fake Paystack: records every call, answers like the real API ──
const paystack = {
  calls: [] as { method: string; path: string; body: Record<string, unknown> | null }[],
  verify: new Map<string, Record<string, unknown>>(),
};
beforeEach(() => {
  paystack.calls = [];
  paystack.verify.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const path = new URL(String(input)).pathname;
      const method = init?.method ?? 'GET';
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      paystack.calls.push({ method, path, body });
      const ok = (data?: unknown) => new Response(JSON.stringify({ status: true, message: 'ok', data }), { status: 200 });
      if (path === '/transaction/initialize') {
        return ok({ authorization_url: `https://checkout.paystack.test/${body?.reference}`, access_code: 'AC', reference: body?.reference });
      }
      if (path.startsWith('/transaction/verify/')) {
        const ref = decodeURIComponent(path.split('/').pop()!);
        return ok(paystack.verify.get(ref) ?? { status: 'abandoned', reference: ref });
      }
      if (path === '/subscription/disable') return ok();
      if (path.endsWith('/manage/link')) return ok({ link: 'https://paystack.test/manage/abc' });
      return new Response(JSON.stringify({ status: false, message: 'unexpected' }), { status: 404 });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

// ── signed webhooks, exactly as Paystack sends them ──
const sign = (raw: string) => createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(raw).digest('hex');
const webhook = (event: string, data: object, signature?: string) => {
  const raw = JSON.stringify({ event, data });
  return app.inject({
    method: 'POST',
    url: '/v1/webhooks/paystack',
    payload: raw,
    headers: { 'content-type': 'application/json', 'x-paystack-signature': signature ?? sign(raw) },
  });
};

// ── test data ──
async function seedCatalog() {
  const slug = `b-${rand()}`;
  const product = await prisma.product.create({
    data: {
      slug,
      name: 'Billing Test Product',
      description: 'd',
      plans: {
        create: [
          { code: 'sub-monthly', name: 'Monthly', billingModel: 'SUBSCRIPTION', interval: 'MONTH', endpointLimit: 10 },
          { code: 'perpetual', name: 'Perpetual', billingModel: 'PERPETUAL', interval: 'ONE_TIME' },
          { code: 'unpriced', name: 'Unpriced', billingModel: 'SUBSCRIPTION', interval: 'YEAR' },
        ],
      },
    },
  });
  const plans = await prisma.plan.findMany({ where: { productId: product.id } });
  const byCode = (c: string) => plans.find((p) => p.code === c)!;
  const planCode = `PLN_${rand()}`;
  await prisma.planPrice.createMany({
    data: [
      { planId: byCode('sub-monthly').id, currency: 'NGN', amountMinor: 2_500_000, provider: 'PAYSTACK', providerPlanCode: planCode },
      { planId: byCode('perpetual').id, currency: 'USD', amountMinor: 50_000, provider: 'PAYSTACK' },
    ],
  });
  return { slug, product, planCode, monthly: byCode('sub-monthly'), perpetual: byCode('perpetual') };
}

async function orgOwner() {
  const owner = await createUser(app);
  expect((await call(owner, 'POST', '/v1/orgs', { name: 'Billing Co' })).statusCode).toBe(201);
  const orgId = (await call(owner, 'GET', '/v1/me')).json().org.id as string;
  return { owner, orgId };
}

const checkout = (u: TestUser | null, slug: string, planCode: string, currency: string) =>
  call(u, 'POST', '/v1/billing/checkout', { productSlug: slug, planCode, currency });

/** A charge.success payload as Paystack would send it for our checkout. */
const chargeFor = (reference: string, amount: number, currency: string, customerCode: string, planCode?: string) => ({
  id: Math.floor(Math.random() * 1e9),
  status: 'success',
  reference,
  amount,
  currency,
  customer: { customer_code: customerCode, email: 'x@example.test' },
  plan: planCode ? { plan_code: planCode } : {},
});

describe('checkout', () => {
  it('starts a Paystack payment for the right amount, and records it as pending', async () => {
    const cat = await seedCatalog();
    const { owner, orgId } = await orgOwner();

    const res = await checkout(owner, cat.slug, 'sub-monthly', 'ngn'); // lower case is accepted
    expect(res.statusCode).toBe(201);
    expect(res.json().authorizationUrl).toContain('checkout.paystack.test');

    const init = paystack.calls.find((c) => c.path === '/transaction/initialize')!;
    expect(init.body).toMatchObject({ email: owner.email, amount: 2_500_000, currency: 'NGN', plan: cat.planCode });

    const payment = await prisma.payment.findUniqueOrThrow({ where: { reference: res.json().reference } });
    expect(payment).toMatchObject({ status: 'PENDING', orgId, userId: null, amountMinor: 2_500_000, currency: 'NGN' });
  });

  it('is refused for anonymous users, members without billing rights, and unpriced plans', async () => {
    const cat = await seedCatalog();
    const { owner } = await orgOwner();
    const member = await createUser(app);
    await addMember(app, owner, member, ['STANDARD_USER']);
    const billingAdmin = await createUser(app);
    await addMember(app, owner, billingAdmin, ['BILLING_ADMIN']);

    expect((await checkout(null, cat.slug, 'sub-monthly', 'NGN')).statusCode).toBe(401);
    expect((await checkout(member, cat.slug, 'sub-monthly', 'NGN')).statusCode).toBe(403);
    expect((await checkout(owner, cat.slug, 'unpriced', 'NGN')).json().code).toBe('NOT_PURCHASABLE');
    expect((await checkout(owner, cat.slug, 'sub-monthly', 'USD')).json().code).toBe('NOT_PURCHASABLE'); // no USD price
    expect((await checkout(owner, cat.slug, 'nope', 'NGN')).statusCode).toBe(404);
    expect((await checkout(billingAdmin, cat.slug, 'sub-monthly', 'NGN')).statusCode).toBe(201); // billing admins may buy
  });

  it('lets an individual (no organisation) buy for themselves, and fails cleanly when Paystack is down', async () => {
    const cat = await seedCatalog();
    const solo = await createUser(app);
    const ok = await checkout(solo, cat.slug, 'perpetual', 'USD');
    expect(ok.statusCode).toBe(201);
    expect(await prisma.payment.findUniqueOrThrow({ where: { reference: ok.json().reference } })).toMatchObject({ userId: expect.any(String), orgId: null });

    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
    const down = await checkout(await createUser(app), cat.slug, 'perpetual', 'USD');
    expect(down.statusCode).toBe(502);
    expect(down.json().code).toBe('PAYMENT_PROVIDER_ERROR');
    expect(await prisma.payment.count({ where: { status: 'FAILED', planId: cat.perpetual.id } })).toBeGreaterThan(0);
  });
});

describe('webhook security', () => {
  it('rejects a missing or wrong signature and acts on nothing', async () => {
    const cat = await seedCatalog();
    const { owner } = await orgOwner();
    const ref = (await checkout(owner, cat.slug, 'sub-monthly', 'NGN')).json().reference as string;

    const body = chargeFor(ref, 2_500_000, 'NGN', 'CUS_forged', cat.planCode);
    expect((await webhook('charge.success', body, 'deadbeef')).statusCode).toBe(401);
    const raw = JSON.stringify({ event: 'charge.success', data: body });
    const noHeader = await app.inject({ method: 'POST', url: '/v1/webhooks/paystack', payload: raw, headers: { 'content-type': 'application/json' } });
    expect(noHeader.statusCode).toBe(401);

    expect((await prisma.payment.findUniqueOrThrow({ where: { reference: ref } })).status).toBe('PENDING');
    expect(await prisma.entitlement.count({ where: { providerCustomerCode: 'CUS_forged' } })).toBe(0);
  });

  it('acknowledges events it does not use', async () => {
    expect((await webhook('transfer.success', { id: rand() })).statusCode).toBe(200);
  });
});

describe('subscription lifecycle', () => {
  it('grants on payment, links the subscription, renews, and winds down on cancellation', async () => {
    const cat = await seedCatalog();
    const { owner, orgId } = await orgOwner();
    const ref = (await checkout(owner, cat.slug, 'sub-monthly', 'NGN')).json().reference as string;
    const customer = `CUS_${rand()}`;

    // 1. first payment
    const paid = chargeFor(ref, 2_500_000, 'NGN', customer, cat.planCode);
    expect((await webhook('charge.success', paid)).statusCode).toBe(200);
    const ent = await prisma.entitlement.findFirstOrThrow({ where: { orgId, planId: cat.monthly.id } });
    expect(ent).toMatchObject({ status: 'ACTIVE', source: 'PAYSTACK', providerCustomerCode: customer, providerPlanCode: cat.planCode });
    expect(ent.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 30 * DAY);

    const listed = (await call(owner, 'GET', '/v1/entitlements')).json().entitlements;
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ state: 'active', endpointLimit: 10, product: { slug: cat.slug } });

    // 2. the same webhook delivered again changes nothing
    expect((await webhook('charge.success', paid)).json().duplicate).toBe(true);
    expect(await prisma.entitlement.count({ where: { orgId, planId: cat.monthly.id } })).toBe(1);

    // 3. buying again while active is refused
    expect((await checkout(owner, cat.slug, 'sub-monthly', 'NGN')).json().code).toBe('ALREADY_ENTITLED');

    // 4. subscription.create stores what is needed to cancel
    const next = new Date(Date.now() + 30 * DAY).toISOString();
    const subCode = `SUB_${rand()}`;
    await webhook('subscription.create', { subscription_code: subCode, email_token: 'tok123', next_payment_date: next, plan: { plan_code: cat.planCode }, customer: { customer_code: customer, email: owner.email } });
    expect(await prisma.entitlement.findUniqueOrThrow({ where: { id: ent.id } })).toMatchObject({ providerSubscriptionCode: subCode, providerEmailToken: 'tok123' });

    // 5. a renewal (a charge with the plan and a reference we did not create) extends access
    await prisma.entitlement.update({ where: { id: ent.id }, data: { expiresAt: new Date(Date.now() + DAY) } });
    const renewalRef = `renew-${rand()}`;
    await webhook('charge.success', chargeFor(renewalRef, 2_500_000, 'NGN', customer, cat.planCode));
    const renewed = await prisma.entitlement.findUniqueOrThrow({ where: { id: ent.id } });
    expect(renewed.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 30 * DAY);
    expect(await prisma.payment.count({ where: { entitlementId: ent.id, status: 'SUCCEEDED' } })).toBe(2);

    // 6. the customer cancels: paid time stays, the provider is told, a second cancel is harmless
    const cancel = await call(owner, 'POST', `/v1/billing/entitlements/${ent.id}/cancel`);
    expect(cancel.statusCode).toBe(200);
    const disable = paystack.calls.find((c) => c.path === '/subscription/disable')!;
    expect(disable.body).toEqual({ code: subCode, token: 'tok123' });
    expect((await call(owner, 'GET', '/v1/entitlements')).json().entitlements[0].state).toBe('cancelling');
    expect((await call(owner, 'POST', `/v1/billing/entitlements/${ent.id}/cancel`)).statusCode).toBe(200);

    // 7. at the end of the period Paystack disables it, and access stops
    await webhook('subscription.disable', { subscription_code: subCode, customer: { email: owner.email } });
    expect((await call(owner, 'GET', '/v1/entitlements')).json().entitlements[0].state).toBe('cancelled');
  });

  it('handles subscription.create arriving before its payment: asks Paystack to retry', async () => {
    const cat = await seedCatalog();
    const { owner } = await orgOwner();
    const ref = (await checkout(owner, cat.slug, 'sub-monthly', 'NGN')).json().reference as string;
    const customer = `CUS_${rand()}`;
    const subscription = { subscription_code: `SUB_${rand()}`, email_token: 't', next_payment_date: new Date(Date.now() + 30 * DAY).toISOString(), plan: { plan_code: cat.planCode }, customer: { customer_code: customer } };

    const early = await webhook('subscription.create', subscription);
    expect(early.statusCode).toBe(503); // not stored as handled, so the retry is processed

    await webhook('charge.success', chargeFor(ref, 2_500_000, 'NGN', customer, cat.planCode));
    expect((await webhook('subscription.create', subscription)).statusCode).toBe(200);
    expect(await prisma.entitlement.count({ where: { providerSubscriptionCode: subscription.subscription_code } })).toBe(1);
  });

  it('records a failed renewal and emails the customer', async () => {
    const cat = await seedCatalog();
    const { owner, orgId } = await orgOwner();
    const ref = (await checkout(owner, cat.slug, 'sub-monthly', 'NGN')).json().reference as string;
    const customer = `CUS_${rand()}`;
    await webhook('charge.success', chargeFor(ref, 2_500_000, 'NGN', customer, cat.planCode));
    const subCode = `SUB_${rand()}`;
    await webhook('subscription.create', { subscription_code: subCode, email_token: 't', next_payment_date: new Date(Date.now() + 30 * DAY).toISOString(), plan: { plan_code: cat.planCode }, customer: { customer_code: customer } });

    expect((await webhook('invoice.payment_failed', { subscription: { subscription_code: subCode }, customer: { email: owner.email } })).statusCode).toBe(200);
    expect(mailOutbox.some((m) => m.to === owner.email && m.subject.includes('did not go through'))).toBe(true);
    expect(await prisma.auditLog.count({ where: { action: 'billing.payment_failed', orgId } })).toBe(1);
  });
});

describe('one-off licences and tampering', () => {
  it('gives a perpetual plan a licence key and no expiry', async () => {
    const cat = await seedCatalog();
    const solo = await createUser(app);
    const ref = (await checkout(solo, cat.slug, 'perpetual', 'USD')).json().reference as string;
    await webhook('charge.success', chargeFor(ref, 50_000, 'USD', `CUS_${rand()}`));

    const e = (await call(solo, 'GET', '/v1/entitlements')).json().entitlements[0];
    expect(e).toMatchObject({ state: 'active', expiresAt: null });
    expect(e.licenseKey).toMatch(/^SP-[0-9A-F]{12}$/);
  });

  it('flags a payment whose amount or currency is not what was asked for, and grants nothing', async () => {
    const cat = await seedCatalog();
    const { owner, orgId } = await orgOwner();
    const ref = (await checkout(owner, cat.slug, 'sub-monthly', 'NGN')).json().reference as string;

    await webhook('charge.success', chargeFor(ref, 100, 'NGN', `CUS_${rand()}`, cat.planCode)); // underpaid
    expect((await prisma.payment.findUniqueOrThrow({ where: { reference: ref } })).status).toBe('FLAGGED');
    expect(await prisma.entitlement.count({ where: { orgId, planId: cat.monthly.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'billing.payment_flagged', orgId } })).toBe(1);
  });
});

describe('returning from Paystack (verify)', () => {
  it('confirms a payment without waiting for the webhook, once, and only for its owner', async () => {
    const cat = await seedCatalog();
    const { owner } = await orgOwner();
    const ref = (await checkout(owner, cat.slug, 'sub-monthly', 'NGN')).json().reference as string;

    // Customer abandoned or has not finished: still pending.
    expect((await call(owner, 'GET', `/v1/billing/verify?reference=${ref}`)).json().status).toBe('pending');

    paystack.verify.set(ref, chargeFor(ref, 2_500_000, 'NGN', `CUS_${rand()}`, cat.planCode));
    const done = await call(owner, 'GET', `/v1/billing/verify?reference=${ref}`);
    expect(done.json().status).toBe('succeeded');
    expect(done.json().entitlementId).toBeTruthy();

    // A second verify, and the webhook arriving afterwards, grant nothing more.
    await call(owner, 'GET', `/v1/billing/verify?reference=${ref}`);
    await webhook('charge.success', chargeFor(ref, 2_500_000, 'NGN', `CUS_${rand()}`, cat.planCode));
    expect(await prisma.entitlement.count({ where: { planId: cat.monthly.id } })).toBe(1);

    // Somebody else's reference is invisible.
    const { owner: other } = await orgOwner();
    expect((await call(other, 'GET', `/v1/billing/verify?reference=${ref}`)).statusCode).toBe(404);
  });
});

describe('who can see and manage billing', () => {
  it('keeps cancel and payment history to the right roles', async () => {
    const cat = await seedCatalog();
    const { owner } = await orgOwner();
    const member = await createUser(app);
    await addMember(app, owner, member, ['STANDARD_USER']);
    const auditor = await createUser(app);
    await addMember(app, owner, auditor, ['AUDITOR']);

    const ref = (await checkout(owner, cat.slug, 'sub-monthly', 'NGN')).json().reference as string;
    await webhook('charge.success', chargeFor(ref, 2_500_000, 'NGN', `CUS_${rand()}`, cat.planCode));
    const ent = await prisma.entitlement.findFirstOrThrow({ where: { planId: cat.monthly.id } });

    expect((await call(member, 'POST', `/v1/billing/entitlements/${ent.id}/cancel`)).statusCode).toBe(403);
    expect((await call(member, 'GET', '/v1/billing/payments')).statusCode).toBe(403);
    expect((await call(owner, 'GET', '/v1/billing/payments')).json().payments[0]).toMatchObject({ status: 'succeeded', amountMinor: 2_500_000, currency: 'NGN' });
    // Members can still see what the organisation is entitled to.
    expect((await call(member, 'GET', '/v1/entitlements')).json().entitlements).toHaveLength(1);
    // A card-billed plan with no subscription yet cannot be cancelled online.
    expect((await call(owner, 'POST', `/v1/billing/entitlements/${ent.id}/cancel`)).json().code).toBe('NOT_CANCELLABLE_ONLINE');
  });
});

describe('invoice / purchase-order path', () => {
  it('goes request -> invoice -> activate, and then grants an endpoint-limited entitlement', async () => {
    const cat = await seedCatalog();
    const { owner, orgId } = await orgOwner();
    const member = await createUser(app);
    await addMember(app, owner, member, ['STANDARD_USER']);
    const staff = await createStaff(app);

    const body = { productSlug: cat.slug, planCode: 'sub-monthly', quantity: 40, reference: 'PO-7781', notes: 'Please invoice in naira' };
    expect((await call(member, 'POST', '/v1/billing/purchase-orders', body)).statusCode).toBe(403);
    expect((await call(await createUser(app), 'POST', '/v1/billing/purchase-orders', body)).json().code).toBe('ORG_REQUIRED');

    const created = await call(owner, 'POST', '/v1/billing/purchase-orders', body);
    expect(created.statusCode).toBe(201);
    const poId = created.json().id as string;
    const notice = mailOutbox.find((m) => m.subject.includes(poId));
    expect(notice?.to).toBe('support@stackprimeconsulting.com.ng');
    expect(notice?.replyTo).toBe(owner.email); // support's reply goes straight to the customer

    // Not staff: no access to the admin side.
    expect((await call(owner, 'GET', '/v1/admin/purchase-orders')).statusCode).toBe(403);
    expect((await call(staff, 'GET', '/v1/admin/purchase-orders?status=REQUESTED')).json().purchaseOrders.some((p: { id: string }) => p.id === poId)).toBe(true);

    expect((await call(staff, 'POST', `/v1/admin/purchase-orders/${poId}/status`, { status: 'INVOICED' })).statusCode).toBe(200);
    expect((await call(staff, 'POST', `/v1/admin/purchase-orders/${poId}/activate`, { expiresAt: new Date(Date.now() - DAY).toISOString() })).statusCode).toBe(400); // past date

    const expiresAt = new Date(Date.now() + 365 * DAY).toISOString();
    const activated = await call(staff, 'POST', `/v1/admin/purchase-orders/${poId}/activate`, { expiresAt });
    expect(activated.statusCode).toBe(200);
    expect(activated.json().endpointLimit).toBe(40); // defaults to the quantity ordered
    expect((await call(staff, 'POST', `/v1/admin/purchase-orders/${poId}/activate`, { expiresAt })).json().code).toBe('INVALID_STATE');

    const seen = (await call(member, 'GET', '/v1/entitlements')).json().entitlements[0];
    expect(seen).toMatchObject({ state: 'active', source: 'po_invoice', endpointLimit: 40 });
    expect((await call(owner, 'GET', '/v1/billing/purchase-orders')).json().purchaseOrders[0].status).toBe('paid');
    expect(await prisma.auditLog.count({ where: { action: 'billing.po_activated', orgId } })).toBe(1);
  });

  it('can be rejected', async () => {
    const cat = await seedCatalog();
    const { owner } = await orgOwner();
    const staff = await createStaff(app);
    const po = await call(owner, 'POST', '/v1/billing/purchase-orders', { productSlug: cat.slug, planCode: 'sub-monthly', quantity: 5 });
    const id = po.json().id as string;
    expect((await call(staff, 'POST', `/v1/admin/purchase-orders/${id}/status`, { status: 'REJECTED' })).statusCode).toBe(200);
    expect((await call(staff, 'POST', `/v1/admin/purchase-orders/${id}/activate`, { expiresAt: new Date(Date.now() + DAY).toISOString() })).json().code).toBe('INVALID_STATE');
  });
});

describe('manual grants', () => {
  it('lets staff grant and revoke access with a recorded reason', async () => {
    const cat = await seedCatalog();
    const { orgId } = await orgOwner();
    const staff = await createStaff(app);

    const noReason = await call(staff, 'POST', '/v1/admin/entitlements', { orgId, productSlug: cat.slug, planCode: 'sub-monthly' });
    expect(noReason.statusCode).toBe(400);
    const both = await call(staff, 'POST', '/v1/admin/entitlements', { orgId, userId: 'x', productSlug: cat.slug, planCode: 'sub-monthly', reason: 'trial for pilot' });
    expect(both.statusCode).toBe(400);

    const granted = await call(staff, 'POST', '/v1/admin/entitlements', { orgId, productSlug: cat.slug, planCode: 'sub-monthly', endpointLimit: 3, expiresAt: new Date(Date.now() + 14 * DAY).toISOString(), reason: '14-day pilot agreed by email' });
    expect(granted.statusCode).toBe(201);
    const id = granted.json().id as string;
    expect(await prisma.entitlement.findUniqueOrThrow({ where: { id } })).toMatchObject({ source: 'MANUAL', status: 'ACTIVE', endpointLimit: 3 });

    expect((await call(staff, 'POST', `/v1/admin/entitlements/${id}/revoke`, { reason: 'pilot ended early' })).statusCode).toBe(200);
    expect((await call(staff, 'POST', `/v1/admin/entitlements/${id}/revoke`, { reason: 'pilot ended early' })).json().code).toBe('INVALID_STATE');
    expect(await prisma.auditLog.count({ where: { action: 'billing.entitlement_revoked', orgId } })).toBe(1);
  });
});
