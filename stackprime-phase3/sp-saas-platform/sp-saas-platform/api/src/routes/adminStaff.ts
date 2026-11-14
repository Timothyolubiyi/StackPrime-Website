import type { FastifyPluginAsync } from 'fastify';
import type { StaffRole } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { requireStaffPermission } from '../plugins/authenticate.js';

const staffGuard = {
  preHandler: requireStaffPermission('staff:manage'),
};

const PROTECTED_ADMINS = new Set([
  'timothy@stackprimeconsulting.com.ng',
  'admin@stackprimeconsulting.com.ng',
]);

const ASSIGNABLE_ROLES = new Set([
  'PRODUCT_ADMIN',
  'BILLING_ADMIN',
  'SUPPORT_AGENT',
]);

function isProtectedAdmin(email: string): boolean {
  return PROTECTED_ADMINS.has(email.toLowerCase());
}

function parseRoles(value: unknown): StaffRole[] | null {
  if (!Array.isArray(value)) return null;
  if (value.some((role) => typeof role !== 'string' || !ASSIGNABLE_ROLES.has(role))) {
    return null;
  }
  return [...new Set(value)] as StaffRole[];
}

const adminStaffRoutes: FastifyPluginAsync = async (app) => {
  // List internal staff without exposing password hashes, MFA secrets or recovery codes.
  app.get('/staff', staffGuard, async () => {
    const staff = await prisma.user.findMany({
      where: { isStaff: true },
      select: {
        id: true,
        email: true,
        name: true,
        staffRoles: true,
        staffSuspendedAt: true,
        mfaEnabled: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return { staff };
  });

  // Add an existing verified individual account to StackPrime staff.
  // SUPER_ADMIN cannot be assigned through this API.
  app.post('/staff', staffGuard, async (req, reply) => {
    const body = req.body as { email?: unknown; roles?: unknown };
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const roles = parseRoles(body?.roles);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !roles || roles.length === 0) {
      return reply.code(400).send({
        code: 'INVALID_STAFF_INPUT',
        message: 'Provide a valid email address and at least one assignable staff role.',
      });
    }

    if (isProtectedAdmin(email)) {
      return reply.code(403).send({
        code: 'PROTECTED_ADMIN',
        message: 'Designated top-level administrators must be provisioned through the trusted bootstrap process.',
      });
    }

    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) {
      return reply.code(404).send({
        code: 'USER_NOT_FOUND',
        message: 'The account must register before it can be added as staff.',
      });
    }

    if (!target.emailVerifiedAt || target.orgId !== null || target.isPlatformOwner) {
      return reply.code(400).send({
        code: 'STAFF_ACCOUNT_NOT_ELIGIBLE',
        message: 'Only an existing, email-verified individual account can be added as staff.',
      });
    }

    if (target.isStaff) {
      return reply.code(409).send({
        code: 'ALREADY_STAFF',
        message: 'This account is already a StackPrime staff account.',
      });
    }

    const actor = req.auth!.user;

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: target.id },
        data: {
          isStaff: true,
          staffRoles: roles,
          staffSuspendedAt: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          staffRoles: true,
          staffSuspendedAt: true,
          mfaEnabled: true,
          createdAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'staff.created',
          targetType: 'user',
          targetId: target.id,
          ip: req.ip,
          meta: { email, roles, via: 'admin_api' },
        },
      });

      return user;
    });

    return reply.code(201).send({ staff: updated });
  });

  // Replace a staff member's assigned roles. An empty array removes staff access.
  app.patch<{ Params: { id: string } }>('/staff/:id/roles', staffGuard, async (req, reply) => {
    const body = req.body as { roles?: unknown };
    const roles = parseRoles(body?.roles);

    if (!roles) {
      return reply.code(400).send({
        code: 'INVALID_STAFF_ROLES',
        message: 'Provide a valid array of assignable staff roles.',
      });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target || !target.isStaff) {
      return reply.code(404).send({ code: 'STAFF_NOT_FOUND', message: 'Staff account not found.' });
    }

    if (isProtectedAdmin(target.email)) {
      return reply.code(403).send({
        code: 'PROTECTED_ADMIN',
        message: 'The designated top-level administrator roles cannot be changed through this API.',
      });
    }

    const actor = req.auth!.user;

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: target.id },
        data: {
          staffRoles: roles,
          isStaff: roles.length > 0,
        },
        select: {
          id: true,
          email: true,
          name: true,
          staffRoles: true,
          staffSuspendedAt: true,
          mfaEnabled: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'staff.roles_changed',
          targetType: 'user',
          targetId: target.id,
          ip: req.ip,
          meta: { previousRoles: target.staffRoles, newRoles: roles },
        },
      });

      return user;
    });

    return { staff: updated };
  });

  // Suspend or reactivate an existing staff account.
  app.patch<{ Params: { id: string } }>('/staff/:id/status', staffGuard, async (req, reply) => {
    const body = req.body as { suspended?: unknown };

    if (typeof body?.suspended !== 'boolean') {
      return reply.code(400).send({
        code: 'INVALID_STAFF_STATUS',
        message: 'The suspended field must be a boolean.',
      });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target || !target.isStaff) {
      return reply.code(404).send({ code: 'STAFF_NOT_FOUND', message: 'Staff account not found.' });
    }

    if (isProtectedAdmin(target.email)) {
      return reply.code(403).send({
        code: 'PROTECTED_ADMIN',
        message: 'The designated top-level administrator accounts cannot be suspended through this API.',
      });
    }

    if (target.id === req.auth!.user.id && body.suspended) {
      return reply.code(400).send({
        code: 'CANNOT_SUSPEND_SELF',
        message: 'You cannot suspend your own staff account.',
      });
    }

    const suspendedAt = body.suspended ? new Date() : null;
    const actor = req.auth!.user;

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: target.id },
        data: { staffSuspendedAt: suspendedAt },
        select: {
          id: true,
          email: true,
          name: true,
          staffRoles: true,
          staffSuspendedAt: true,
          mfaEnabled: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: body.suspended ? 'staff.suspended' : 'staff.reactivated',
          targetType: 'user',
          targetId: target.id,
          ip: req.ip,
          meta: { email: target.email },
        },
      });

      return user;
    });

    return { staff: updated };
  });
};

export default adminStaffRoutes;
