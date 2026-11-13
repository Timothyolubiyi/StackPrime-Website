import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import type { Org, User } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { permissionsFor, type Permission } from '../lib/rbac.js';

export interface AuthContext {
  user: User & { org: Org | null };
  sessionId: string;
  permissions: Set<Permission>;
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

  // An org can require MFA. Until the member enrols, only the MFA and profile routes work.
  if (user.org?.mfaRequired && !user.mfaEnabled && !req.routeOptions.config?.allowWithoutMfa) {
    return reply.code(403).send({
      code: 'MFA_ENROLMENT_REQUIRED',
      message: 'Your organisation requires two-factor authentication. Set it up to continue.',
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
 * StackPrime staff only (catalog and manual-entitlement admin). Staff must also have MFA on,
 * because these routes control what customers can buy and download.
 */
export const requireStaff: preHandlerAsyncHookHandler[] = [
  authenticate,
  async (req, reply) => {
    const user = req.auth?.user;
    if (!user?.isStaff) return reply.code(403).send({ code: 'FORBIDDEN', message: 'You do not have permission to do that.' });
    if (!user.mfaEnabled) {
      return reply.code(403).send({ code: 'STAFF_MFA_REQUIRED', message: 'Staff accounts must turn on two-factor authentication first.' });
    }
  },
];
