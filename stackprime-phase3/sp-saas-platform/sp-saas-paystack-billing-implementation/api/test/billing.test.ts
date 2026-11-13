import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/db.js';
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

describe('Paystack billing security', () => {
  it('rejects unsigned webhook requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/billing/webhooks/paystack',
      payload: { event: 'charge.success', data: { id: 123, reference: 'sp_test', status: 'success', amount: 1000, currency: 'NGN' } },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().code).toBe('INVALID_SIGNATURE');
  });

  it('requires authentication before initializing checkout', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/billing/checkout',
      payload: { planId: 'plan_test', currency: 'NGN' },
    });
    expect(response.statusCode).toBe(401);
  });
});
