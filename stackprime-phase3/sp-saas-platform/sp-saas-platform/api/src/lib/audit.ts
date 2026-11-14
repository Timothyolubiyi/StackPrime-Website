import type { FastifyRequest } from 'fastify';
import type { Prisma } from '@prisma/client';
import { prisma } from './db.js';

export interface AuditEntry {
  action: string; // e.g. "auth.login", "auth.mfa_enabled"
  actorId?: string | null;
  orgId?: string | null;
  targetType?: string;
  targetId?: string;
  meta?: Prisma.InputJsonValue;
}

// Audit failures are logged but never break the user's request.
export async function audit(req: FastifyRequest | null, e: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: e.action,
        actorId: e.actorId ?? null,
        orgId: e.orgId ?? null,
        targetType: e.targetType,
        targetId: e.targetId,
        ip: req?.ip,
        meta: e.meta,
      },
    });
  } catch (err) {
    req?.log.error({ err, action: e.action }, 'audit write failed');
  }
}
