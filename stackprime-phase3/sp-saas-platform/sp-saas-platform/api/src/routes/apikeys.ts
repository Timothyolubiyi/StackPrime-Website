import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { audit } from '../lib/audit.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { prisma } from '../lib/db.js';
import { httpError } from '../lib/errors.js';
import { permissionsFor } from '../lib/rbac.js';
import { requirePermission } from '../plugins/authenticate.js';

const limit = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });
const MAX_ACTIVE_KEYS = 25;

// Keys can read as a person with one of these roles would. They can never be an owner or a billing admin:
// a leaked key must not be able to change who has access or touch money.
const KEY_ROLES = ['IT_ADMIN', 'STANDARD_USER', 'AUDITOR'] as const;

export default async function apiKeyRoutes(app: FastifyInstance) {
  app.post('/api-keys', { preHandler: requirePermission('apikeys:manage'), config: limit(10) }, async (req, reply) => {
    const body = z
      .object({ name: z.string().trim().min(1).max(80), roles: z.array(z.enum(KEY_ROLES)).min(1).max(KEY_ROLES.length) })
      .parse(req.body);
    const { user, permissions } = req.auth!;
    const orgId = user.orgId!;

    // You cannot hand out more power than you have yourself.
    for (const role of body.roles) {
      for (const p of permissionsFor({ orgId, roles: [role] })) {
        if (!permissions.has(p)) throw httpError(403, 'FORBIDDEN', 'You cannot create a key with more access than your own.');
      }
    }
    if ((await prisma.apiKey.count({ where: { orgId, revokedAt: null } })) >= MAX_ACTIVE_KEYS) {
      throw httpError(409, 'TOO_MANY_KEYS', 'Too many active keys. Revoke some first.');
    }

    const key = `spk_${randomToken(32)}`;
    const row = await prisma.apiKey.create({
      data: { orgId, createdById: user.id, name: body.name, prefix: key.slice(0, 12), keyHash: sha256(key), roles: { set: [...new Set(body.roles)] } },
    });
    await audit(req, { action: 'apikeys.created', actorId: user.id, orgId, targetType: 'api_key', targetId: row.id, meta: { name: body.name, roles: row.roles } });
    // The full key is shown this once. Only its hash is stored.
    return reply.code(201).send({ id: row.id, name: row.name, roles: row.roles, prefix: row.prefix, key, notice: 'Copy this key now. It will not be shown again.' });
  });

  app.get('/api-keys', { preHandler: requirePermission('apikeys:manage') }, async (req) => {
    const keys = await prisma.apiKey.findMany({
      where: { orgId: req.auth!.user.orgId!, revokedAt: null },
      select: { id: true, name: true, prefix: true, roles: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { keys };
  });

  app.delete<{ Params: { id: string } }>('/api-keys/:id', { preHandler: requirePermission('apikeys:manage'), config: limit(30) }, async (req, reply) => {
    const user = req.auth!.user;
    const r = await prisma.apiKey.updateMany({ where: { id: req.params.id, orgId: user.orgId!, revokedAt: null }, data: { revokedAt: new Date() } });
    if (r.count !== 1) throw httpError(404, 'NOT_FOUND', 'Key not found.');
    await audit(req, { action: 'apikeys.revoked', actorId: user.id, orgId: user.orgId, targetType: 'api_key', targetId: req.params.id });
    return reply.code(204).send();
  });
}
