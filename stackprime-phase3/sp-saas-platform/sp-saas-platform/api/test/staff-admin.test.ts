import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/db.js';
import { redis } from '../src/lib/redis.js';
import {
  call,
  createStaff,
  createUser,
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

describe('StackPrime staff administration lifecycle', () => {
  it('creates staff, changes roles, suspends and reactivates the account with audit records', async () => {
    const admin = await createStaff(app, true, ['SUPER_ADMIN']);
    const target = await createUser(app);

    const created = await call(app, admin, 'POST', '/v1/admin/staff', {
      email: target.email,
      roles: ['PRODUCT_ADMIN'],
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().staff).toMatchObject({
      email: target.email,
      staffRoles: ['PRODUCT_ADMIN'],
      staffSuspendedAt: null,
    });

    const staffId = created.json().staff.id as string;

    const changed = await call(app, admin, 'PATCH', `/v1/admin/staff/${staffId}/roles`, {
      roles: ['BILLING_ADMIN', 'SUPPORT_AGENT'],
    });

    expect(changed.statusCode).toBe(200);
    expect(changed.json().staff.staffRoles).toEqual([
      'BILLING_ADMIN',
      'SUPPORT_AGENT',
    ]);

    const suspended = await call(app, admin, 'PATCH', `/v1/admin/staff/${staffId}/status`, {
      suspended: true,
    });

    expect(suspended.statusCode).toBe(200);
    expect(suspended.json().staff.staffSuspendedAt).toBeTruthy();

    const reactivated = await call(app, admin, 'PATCH', `/v1/admin/staff/${staffId}/status`, {
      suspended: false,
    });

    expect(reactivated.statusCode).toBe(200);
    expect(reactivated.json().staff.staffSuspendedAt).toBeNull();

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: staffId },
      select: {
        isStaff: true,
        staffRoles: true,
        staffSuspendedAt: true,
      },
    });

    expect(stored).toMatchObject({
      isStaff: true,
      staffRoles: ['BILLING_ADMIN', 'SUPPORT_AGENT'],
      staffSuspendedAt: null,
    });

    const auditActions = await prisma.auditLog.findMany({
      where: {
        targetId: staffId,
        action: {
          in: [
            'staff.created',
            'staff.roles_changed',
            'staff.suspended',
            'staff.reactivated',
          ],
        },
      },
      select: { action: true },
    });

    expect(auditActions.map((entry) => entry.action).sort()).toEqual([
      'staff.created',
      'staff.reactivated',
      'staff.roles_changed',
      'staff.suspended',
    ].sort());
  });

  it('does not allow SUPER_ADMIN to be assigned through the staff API', async () => {
    const admin = await createStaff(app, true, ['SUPER_ADMIN']);
    const target = await createUser(app);

    const response = await call(app, admin, 'POST', '/v1/admin/staff', {
      email: target.email,
      roles: ['SUPER_ADMIN'],
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('INVALID_STAFF_INPUT');

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: target.email },
      select: { isStaff: true, staffRoles: true },
    });

    expect(stored).toMatchObject({
      isStaff: false,
      staffRoles: [],
    });
  });

  it('protects both designated administrator emails from ordinary staff provisioning', async () => {
    const admin = await createStaff(app, true, ['SUPER_ADMIN']);

    const protectedEmails = [
      'timothy@stackprimeconsulting.com.ng',
      'admin@stackprimeconsulting.com.ng',
    ];

    for (const email of protectedEmails) {
      const response = await call(app, admin, 'POST', '/v1/admin/staff', {
        email,
        roles: ['PRODUCT_ADMIN'],
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().code).toBe('PROTECTED_ADMIN');
    }
  });

  it('does not allow an ordinary staff member to manage staff accounts', async () => {
    const productAdmin = await createStaff(app, true, ['PRODUCT_ADMIN']);

    const response = await call(app, productAdmin, 'POST', '/v1/admin/staff', {
      email: 'new-staff@example.test',
      roles: ['SUPPORT_AGENT'],
    });

    expect(response.statusCode).toBe(403);
  });
});
