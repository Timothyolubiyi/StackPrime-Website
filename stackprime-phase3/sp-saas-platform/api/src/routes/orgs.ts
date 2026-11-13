import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { audit } from '../lib/audit.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { prisma } from '../lib/db.js';
import { httpError } from '../lib/errors.js';
import { inviteMail, sendMail } from '../lib/mail.js';
import { ROLES } from '../lib/rbac.js';
import { authenticate, requirePermission } from '../plugins/authenticate.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PENDING_INVITES = 50;

const email = z.string().trim().toLowerCase().email().max(254);
const roleList = z
  .array(z.enum(ROLES))
  .min(1, 'Choose at least one role.')
  .max(ROLES.length)
  .transform((r) => [...new Set(r)]);
const orgName = z
  .string()
  .trim()
  .min(2, 'Use at least 2 characters.')
  .max(100)
  .refine((s) => !/[\u0000-\u001f\u007f]/.test(s), 'The name contains invalid characters.');

const limit = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });

/**
 * Removes a member from the organisation, inside a transaction that locks the org row, so two owners
 * demoting or removing each other at the same moment can never leave the org without an owner.
 */
async function detachMember(orgId: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Org" WHERE id = ${orgId} FOR UPDATE`;
    const target = await tx.user.findFirst({ where: { id: userId, orgId } });
    if (!target) throw httpError(404, 'NOT_FOUND', 'Member not found.');
    if (target.roles.includes('ORG_OWNER')) {
      const owners = await tx.user.count({ where: { orgId, roles: { has: 'ORG_OWNER' } } });
      if (owners <= 1) {
        throw httpError(409, 'LAST_OWNER', 'An organisation needs at least one owner. Make someone else an owner first.');
      }
    }
    await tx.user.update({ where: { id: userId }, data: { orgId: null, roles: { set: [] } } });
  });
}

export default async function orgRoutes(app: FastifyInstance) {
  // ── create an organisation (the creator becomes its owner) ──
  app.post('/orgs', { preHandler: authenticate, config: limit(5) }, async (req, reply) => {
    const { name } = z.object({ name: orgName }).parse(req.body);
    const user = req.auth!.user;
    if (user.orgId) throw httpError(409, 'ALREADY_IN_ORG', 'Your account already belongs to an organisation.');

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.org.create({ data: { name } });
      const claimed = await tx.user.updateMany({
        where: { id: user.id, orgId: null },
        data: { orgId: created.id, roles: { set: ['ORG_OWNER'] } },
      });
      if (claimed.count !== 1) throw httpError(409, 'ALREADY_IN_ORG', 'Your account already belongs to an organisation.');
      return created;
    });
    await audit(req, { action: 'org.created', actorId: user.id, orgId: org.id, targetType: 'org', targetId: org.id });
    return reply.code(201).send({ id: org.id, name: org.name, mfaRequired: org.mfaRequired, roles: ['ORG_OWNER'] });
  });

  app.get('/orgs/me', { preHandler: requirePermission('org:read') }, async (req) => {
    const { user } = req.auth!;
    const org = await prisma.org.findUniqueOrThrow({
      where: { id: user.orgId! },
      include: { _count: { select: { members: true } } },
    });
    return {
      id: org.id,
      name: org.name,
      mfaRequired: org.mfaRequired,
      createdAt: org.createdAt,
      memberCount: org._count.members,
      yourRoles: user.roles,
    };
  });

  app.patch('/orgs/me', { preHandler: requirePermission('org:update'), config: limit(20) }, async (req) => {
    const body = z
      .object({ name: orgName.optional(), mfaRequired: z.boolean().optional() })
      .refine((b) => b.name !== undefined || b.mfaRequired !== undefined, 'Nothing to update.')
      .parse(req.body);
    const { user } = req.auth!;

    // Stops an owner from locking themselves into "enrol first" mode.
    if (body.mfaRequired === true && !user.mfaEnabled) {
      throw httpError(409, 'ENABLE_YOUR_OWN_MFA_FIRST', 'Turn on two-factor authentication for your own account before requiring it for the organisation.');
    }
    const org = await prisma.org.update({ where: { id: user.orgId! }, data: body });
    await audit(req, { action: 'org.updated', actorId: user.id, orgId: org.id, meta: { changed: Object.keys(body) } });
    return { id: org.id, name: org.name, mfaRequired: org.mfaRequired };
  });

  // ── members ──
  app.get('/orgs/me/members', { preHandler: requirePermission('org:read') }, async (req) => {
    const members = await prisma.user.findMany({
      where: { orgId: req.auth!.user.orgId! },
      select: { id: true, email: true, name: true, roles: true, mfaEnabled: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return { members };
  });

  app.patch<{ Params: { userId: string } }>(
    '/orgs/me/members/:userId',
    { preHandler: requirePermission('members:manage'), config: limit(30) },
    async (req) => {
      const { roles } = z.object({ roles: roleList }).parse(req.body);
      const { user } = req.auth!;
      const orgId = user.orgId!;

      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Org" WHERE id = ${orgId} FOR UPDATE`;
        const target = await tx.user.findFirst({ where: { id: req.params.userId, orgId } });
        if (!target) throw httpError(404, 'NOT_FOUND', 'Member not found.');
        if (target.roles.includes('ORG_OWNER') && !roles.includes('ORG_OWNER')) {
          const owners = await tx.user.count({ where: { orgId, roles: { has: 'ORG_OWNER' } } });
          if (owners <= 1) {
            throw httpError(409, 'LAST_OWNER', 'An organisation needs at least one owner. Make someone else an owner first.');
          }
        }
        await tx.user.update({ where: { id: target.id }, data: { roles: { set: roles } } });
      });
      await audit(req, {
        action: 'org.member_roles_changed',
        actorId: user.id,
        orgId,
        targetType: 'user',
        targetId: req.params.userId,
        meta: { roles },
      });
      return { id: req.params.userId, roles };
    },
  );

  app.delete<{ Params: { userId: string } }>(
    '/orgs/me/members/:userId',
    { preHandler: requirePermission('members:manage'), config: limit(30) },
    async (req, reply) => {
      const { user } = req.auth!;
      await detachMember(user.orgId!, req.params.userId);
      await audit(req, { action: 'org.member_removed', actorId: user.id, orgId: user.orgId, targetType: 'user', targetId: req.params.userId });
      return reply.code(204).send();
    },
  );

  // Any member can leave on their own (an organisation's last owner cannot).
  app.post('/orgs/me/leave', { preHandler: requirePermission('org:read'), config: limit(5) }, async (req, reply) => {
    const { user } = req.auth!;
    const orgId = user.orgId!;
    await detachMember(orgId, user.id);
    await audit(req, { action: 'org.member_left', actorId: user.id, orgId, targetType: 'user', targetId: user.id });
    return reply.code(204).send();
  });

  // ── invitations ──
  app.post('/orgs/me/invites', { preHandler: requirePermission('members:invite'), config: limit(20) }, async (req, reply) => {
    const body = z.object({ email, roles: roleList }).parse(req.body);
    const { user } = req.auth!;
    const orgId = user.orgId!;

    const alreadyMember = await prisma.user.findFirst({ where: { email: body.email, orgId }, select: { id: true } });
    if (alreadyMember) throw httpError(409, 'ALREADY_MEMBER', 'That person is already a member of this organisation.');

    const pending = await prisma.invite.count({ where: { orgId, acceptedAt: null, expiresAt: { gt: new Date() } } });
    if (pending >= MAX_PENDING_INVITES) throw httpError(409, 'TOO_MANY_INVITES', 'Too many pending invitations. Cancel some first.');

    const token = randomToken(32);
    await prisma.invite.deleteMany({ where: { orgId, email: body.email, acceptedAt: null } }); // newest invite wins
    const invite = await prisma.invite.create({
      data: {
        orgId,
        email: body.email,
        roles: { set: body.roles },
        tokenHash: sha256(token),
        invitedBy: user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    let emailSent = true;
    try {
      const org = await prisma.org.findUniqueOrThrow({ where: { id: orgId }, select: { name: true } });
      await sendMail(inviteMail(body.email, org.name, user.name ?? user.email, token));
    } catch (err) {
      emailSent = false;
      req.log.error({ err }, 'invite email failed');
    }
    await audit(req, {
      action: 'org.invite_created',
      actorId: user.id,
      orgId,
      targetType: 'invite',
      targetId: invite.id,
      meta: { email: body.email, roles: body.roles },
    });
    // The token is never returned: it only ever travels by email.
    return reply.code(201).send({ id: invite.id, email: invite.email, roles: invite.roles, expiresAt: invite.expiresAt, emailSent });
  });

  app.get('/orgs/me/invites', { preHandler: requirePermission('members:invite') }, async (req) => {
    const invites = await prisma.invite.findMany({
      where: { orgId: req.auth!.user.orgId!, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, roles: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { invites };
  });

  app.delete<{ Params: { id: string } }>(
    '/orgs/me/invites/:id',
    { preHandler: requirePermission('members:invite'), config: limit(30) },
    async (req, reply) => {
      const { user } = req.auth!;
      const r = await prisma.invite.deleteMany({ where: { id: req.params.id, orgId: user.orgId!, acceptedAt: null } });
      if (r.count !== 1) throw httpError(404, 'NOT_FOUND', 'Invitation not found.');
      await audit(req, { action: 'org.invite_cancelled', actorId: user.id, orgId: user.orgId, targetType: 'invite', targetId: req.params.id });
      return reply.code(204).send();
    },
  );

  // The invited person signs in (or signs up with the invited address), then accepts.
  app.post('/invites/accept', { preHandler: authenticate, config: limit(10) }, async (req) => {
    const { token } = z.object({ token: z.string().min(20).max(200) }).parse(req.body);
    const user = req.auth!.user;

    const invite = await prisma.invite.findUnique({ where: { tokenHash: sha256(token) }, include: { org: true } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw httpError(400, 'INVALID_TOKEN', 'This invitation is invalid or has expired.');
    }
    // authenticate() guarantees the account's email is verified, so a matching address proves it is theirs.
    if (invite.email !== user.email) {
      throw httpError(403, 'WRONG_ACCOUNT', 'This invitation was sent to a different email address. Sign in with that address.');
    }
    if (user.orgId) throw httpError(409, 'ALREADY_IN_ORG', 'Your account already belongs to an organisation.');

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.invite.updateMany({ where: { id: invite.id, acceptedAt: null }, data: { acceptedAt: new Date() } });
      if (claimed.count !== 1) throw httpError(400, 'INVALID_TOKEN', 'This invitation is invalid or has expired.');
      const joined = await tx.user.updateMany({
        where: { id: user.id, orgId: null },
        data: { orgId: invite.orgId, roles: { set: invite.roles } },
      });
      if (joined.count !== 1) throw httpError(409, 'ALREADY_IN_ORG', 'Your account already belongs to an organisation.');
    });
    await audit(req, {
      action: 'org.invite_accepted',
      actorId: user.id,
      orgId: invite.orgId,
      targetType: 'invite',
      targetId: invite.id,
      meta: { roles: invite.roles },
    });
    return { org: { id: invite.org.id, name: invite.org.name }, roles: invite.roles };
  });

  // ── audit log for this organisation ──
  app.get('/orgs/me/audit', { preHandler: requirePermission('audit:read') }, async (req) => {
    const q = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(50),
        before: z.string().regex(/^\d+$/).optional(), // cursor: the id of the oldest event already seen
      })
      .parse(req.query);
    const rows = await prisma.auditLog.findMany({
      where: { orgId: req.auth!.user.orgId!, ...(q.before ? { id: { lt: BigInt(q.before) } } : {}) },
      orderBy: { id: 'desc' },
      take: q.limit,
    });
    return {
      // ids are BigInt in the database, which JSON cannot carry, so they go out as strings
      events: rows.map((r) => ({
        id: String(r.id),
        at: r.at,
        action: r.action,
        actorId: r.actorId,
        targetType: r.targetType,
        targetId: r.targetId,
        ip: r.ip,
        meta: r.meta,
      })),
      nextBefore: rows.length === q.limit ? String(rows[rows.length - 1]!.id) : null,
    };
  });
}
