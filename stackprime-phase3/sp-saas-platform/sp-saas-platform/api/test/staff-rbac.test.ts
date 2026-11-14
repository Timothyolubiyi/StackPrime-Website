import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/db.js';
import { redis } from '../src/lib/redis.js';
import {
  call,
  createStaff,
  createUser,
  enableMfa,
  seedRelease,
  type TestUser,
} from './helpers.js';

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

describe('StackPrime staff role isolation', () => {
  it('allows PRODUCT_ADMIN product management but denies billing and staff management', async () => {
    const staff = await createStaff(app, true, ['PRODUCT_ADMIN']);
    const release = await seedRelease();

    expect(
      (await call(app, staff, 'GET', `/v1/admin/products/${release.slug}/versions`)).statusCode,
    ).toBe(200);

    expect(
      (await call(app, staff, 'GET', '/v1/admin/products')).statusCode,
    ).toBe(403);

    expect(
      (await call(app, staff, 'GET', '/v1/admin/staff')).statusCode,
    ).toBe(403);
  });

  it('allows BILLING_ADMIN billing management but denies product and staff management', async () => {
    const staff = await createStaff(app, true, ['BILLING_ADMIN']);

    expect(
      (await call(app, staff, 'GET', '/v1/admin/products')).statusCode,
    ).toBe(200);

    expect(
      (await call(app, staff, 'GET', '/v1/admin/staff')).statusCode,
    ).toBe(403);

    const release = await seedRelease();

    expect(
      (await call(app, staff, 'GET', `/v1/admin/products/${release.slug}/versions`)).statusCode,
    ).toBe(403);
  });

  it('allows SUPER_ADMIN to manage products, billing, and staff', async () => {
    const staff = await createStaff(app, true, ['SUPER_ADMIN']);
    const release = await seedRelease();

    expect(
      (await call(app, staff, 'GET', `/v1/admin/products/${release.slug}/versions`)).statusCode,
    ).toBe(200);

    expect(
      (await call(app, staff, 'GET', '/v1/admin/products')).statusCode,
    ).toBe(200);

    expect(
      (await call(app, staff, 'GET', '/v1/admin/staff')).statusCode,
    ).toBe(200);
  });

  it('denies privileged access to isStaff accounts without an assigned staff role', async () => {
    const staff: TestUser = await createUser(app);

    await prisma.user.update({
      where: { email: staff.email },
      data: { isStaff: true, staffRoles: [] },
    });

    await enableMfa(app, staff);

    expect(
      (await call(app, staff, 'GET', '/v1/admin/staff')).statusCode,
    ).toBe(403);
  });

  it('requires MFA before allowing privileged staff operations', async () => {
    const staff = await createStaff(app, false, ['SUPER_ADMIN']);

    const response = await call(app, staff, 'GET', '/v1/admin/staff');

    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe('MFA_ENROLMENT_REQUIRED');
  });
});
