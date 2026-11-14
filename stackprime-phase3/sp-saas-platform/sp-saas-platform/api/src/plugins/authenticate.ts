import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import type { Org, User } from '@prisma/client';
import { sha256 } from '../lib/crypto.js';
import { prisma } from '../lib/db.js';
import { permissionsFor, type Permission } from '../lib/rbac.js';
import { hasStaffPermissions, type StaffPermission } from '../lib/staff-rbac.js';

export interface AuthContext {
  user: User & { org: Org | null };
  sessionId: string;
  permissions: Set<Permission>;
  viaApiKey?: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
  // Per-route flag read by `authenticate`: let the route run while an org-required MFA enrolment is pending.
  interface FastifyContextConfig {
    allowWithoutMfa?: boolean;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; sid: string };
    user: { sub: string; sid: string };
  }
}

const unauthenticated = (reply: FastifyReply) =>
  reply.code(401).send({ code: 'UNAUTHENTICATED', message: 'Sign in required.' });

/**
 * Verifies the access token, then loads the session, user and org from Postgres in ONE query.
 * Because the session row is checked on every request, logout / revoke / password reset take
 * effect immediately, and role changes apply without waiting for the token to expire.
 */
export const authenticate: preHandlerAsyncHookHandler = async function (req: FastifyRequest, reply: FastifyReply) {
  let payload: { sub: string; sid: string };
  try {
    payload = await req.jwtVerify<{ sub: string; sid: string }>();
  } catch {
    return unauthenticated(reply);
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: { user: { include: { org: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date() || session.userId !== payload.sub) {
    return unauthenticated(reply);
  }
  const user = session.user;
  if (!user.emailVerifiedAt) return unauthenticated(reply);

  // Organisations and StackPrime staff must enrol MFA before accessing protected routes.
  const staffMfaRequired = user.isStaff || user.isPlatformOwner;
  const orgMfaRequired = Boolean(user.org?.mfaRequired);

  if (
    (staffMfaRequired || orgMfaRequired) &&
    !user.mfaEnabled &&
    !req.routeOptions.config?.allowWithoutMfa
  ) {
    return reply.code(403).send({
      code: 'MFA_ENROLMENT_REQUIRED',
      message: staffMfaRequired
        ? 'StackPrime staff accounts must set up two-factor authentication before continuing.'
        : 'Your organisation requires two-factor authentication. Set it up to continue.',
    });
  }

  req.auth = { user, sessionId: session.id, permissions: permissionsFor(user) };
};

/** Use as: { preHandler: requirePermission('downloads:create') } */
export const requirePermission = (...needed: Permission[]): preHandlerAsyncHookHandler[] => [
  authenticate,
  async (req, reply) => {
    const have = req.auth?.permissions;
    if (!have || !needed.every((p) => have.has(p))) {
      return reply.code(403).send({ code: 'FORBIDDEN', message: 'You do not have permission to do that.' });
    }
  },
];

/**
 * StackPrime internal authorization.
 * Staff roles are independent of customer organisation roles.
 */
export const requireStaffPermission = (...needed: StaffPermission[]): preHandlerAsyncHookHandler[] => [
  authenticate,
  async (req, reply) => {
    const user = req.auth?.user;

    if (!user || req.auth?.viaApiKey || !user.isStaff || user.staffSuspendedAt) {
      return reply.code(403).send({
        code: 'FORBIDDEN',
        message: 'You do not have permission to do that.',
      });
    }

    if (!user.mfaEnabled) {
      return reply.code(403).send({
        code: 'STAFF_MFA_REQUIRED',
        message: 'Staff accounts must turn on two-factor authentication first.',
      });
    }

    if (!hasStaffPermissions(user.staffRoles, needed)) {
      return reply.code(403).send({
        code: 'FORBIDDEN',
        message: 'Your StackPrime staff role does not permit this action.',
      });
    }
  },
];

/**
 * Temporary compatibility guard for routes not yet migrated.
 * It deliberately grants access only to SUPER_ADMIN accounts.
 */
export const requireStaff: preHandlerAsyncHookHandler[] =
  requireStaffPermission('staff:manage');

/**
 * Accepts `Authorization: ApiKey spk_...` as well as a normal sign-in. A key acts as its organisation with
 * the permissions of its roles. Use this only on routes that READ data: a key has no person behind it, so
 * routes that record "who did this" against a user must keep using `authenticate`.
 */
export const authenticateOrKey: preHandlerAsyncHookHandler = async function (req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('ApiKey ')) return authenticate.call(this, req, reply);

  const key = header.slice(7).trim();
  if (!/^spk_[A-Za-z0-9_-]{20,80}$/.test(key)) return unauthenticated(reply);
  const row = await prisma.apiKey.findUnique({ where: { keyHash: sha256(key) }, include: { org: true } });
  if (!row || row.revokedAt) return unauthenticated(reply);

  // Record use, at most once a minute per key.
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
    void prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  }
  const now = new Date();
  const user = {
    id: `apikey:${row.id}`,
    email: `api-key:${row.name}`,
    name: row.name,
    passwordHash: '',
    emailVerifiedAt: now,
    mfaSecretEnc: null,
    mfaEnabled: true,
    isStaff: false,
    staffRoles: [],
    staffSuspendedAt: null,
    isPlatformOwner: false,
    roles: row.roles,
    orgId: row.orgId,
    createdAt: row.createdAt,
    updatedAt: row.createdAt,
    org: row.org,
  };
  req.auth = { user, sessionId: `apikey:${row.id}`, permissions: permissionsFor(user), viaApiKey: true };
};

export const requirePermissionOrKey = (...needed: Permission[]): preHandlerAsyncHookHandler[] => [
  authenticateOrKey,
  async (req, reply) => {
    const have = req.auth?.permissions;
    if (!have || !needed.every((p) => have.has(p))) {
      return reply.code(403).send({ code: 'FORBIDDEN', message: 'You do not have permission to do that.' });
    }
  },
];

/** Rate-limit key: one bucket per API key or device (not per IP) so one busy integration cannot starve others. */
export const rateLimitKey = (req: FastifyRequest): string => {
  const h = req.headers.authorization ?? '';
  return h.startsWith('ApiKey ') || h.startsWith('Device ') ? `key:${sha256(h).slice(0, 16)}` : req.ip;
};
