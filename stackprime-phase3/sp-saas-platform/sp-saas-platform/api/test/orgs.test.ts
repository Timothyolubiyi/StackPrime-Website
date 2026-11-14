import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { sha256 } from '../src/lib/crypto.js';
import { prisma } from '../src/lib/db.js';
import { redis } from '../src/lib/redis.js';
import { createUser, enableMfa, tokenFromMail, uniqueEmail, type TestUser } from './helpers.js';

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

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
const call = (user: TestUser | null, method: Method, url: string, payload?: object) =>
  app.inject({ method, url, payload, headers: user ? user.headers : {} });

type MemberRole = 'BILLING_ADMIN' | 'IT_ADMIN' | 'STANDARD_USER' | 'AUDITOR';
const MEMBER_ROLES: MemberRole[] = ['BILLING_ADMIN', 'IT_ADMIN', 'STANDARD_USER', 'AUDITOR'];

async function inviteAndAccept(owner: TestUser, user: TestUser, roles: string[]) {
  const invite = await call(owner, 'POST', '/v1/orgs/me/invites', { email: user.email, roles });
  expect(invite.statusCode).toBe(201);
  expect(invite.json().token).toBeUndefined(); // the token must only travel by email
  const accept = await call(user, 'POST', '/v1/invites/accept', { token: tokenFromMail(user.email, 'invited') });
  expect(accept.statusCode).toBe(200);
}

/** An owner plus one member for each of the other four roles. */
async function orgWithAllRoles() {
  const owner = await createUser(app);
  const created = await call(owner, 'POST', '/v1/orgs', { name: 'Acme Networks Ltd' });
  expect(created.statusCode).toBe(201);
  const members = {} as Record<MemberRole, TestUser>;
  for (const role of MEMBER_ROLES) {
    const u = await createUser(app);
    await inviteAndAccept(owner, u, [role]);
    members[role] = u;
  }
  return { owner, members, orgId: created.json().id as string };
}

const permissionsOf = async (u: TestUser) => (await call(u, 'GET', '/v1/me')).json().permissions as string[];

describe('creating an organisation', () => {
  it('makes the creator the owner, and only one org per account', async () => {
    const owner = await createUser(app);
    const res = await call(owner, 'POST', '/v1/orgs', { name: 'Solo Ltd' });
    expect(res.statusCode).toBe(201);

    const me = (await call(owner, 'GET', '/v1/me')).json();
    expect(me.roles).toEqual(['ORG_OWNER']);
    expect(me.org.name).toBe('Solo Ltd');
    expect(me.permissions).toContain('billing:manage');
    expect(me.permissions).toContain('members:manage');

    expect((await call(owner, 'POST', '/v1/orgs', { name: 'Second Ltd' })).statusCode).toBe(409);
  });

  it('requires sign-in and a sensible name', async () => {
    expect((await call(null, 'POST', '/v1/orgs', { name: 'Ghost Ltd' })).statusCode).toBe(401);
    const user = await createUser(app);
    expect((await call(user, 'POST', '/v1/orgs', { name: 'x' })).statusCode).toBe(400);
  });
});

describe('the five roles', () => {
  it('give each role exactly the permissions the scope describes', async () => {
    const { owner, members } = await orgWithAllRoles();
    const ownerPerms = await permissionsOf(owner);
    for (const p of ['billing:manage', 'members:manage', 'members:invite', 'audit:read', 'devices:manage', 'downloads:create']) {
      expect(ownerPerms).toContain(p);
    }

    const matrix: Record<MemberRole, { has: string[]; lacks: string[] }> = {
      BILLING_ADMIN: { has: ['billing:manage', 'billing:read'], lacks: ['products:access', 'downloads:create', 'devices:manage', 'audit:read'] },
      IT_ADMIN: { has: ['downloads:create', 'devices:manage', 'apikeys:manage', 'products:access'], lacks: ['billing:manage', 'members:manage', 'members:invite', 'audit:read'] },
      STANDARD_USER: { has: ['downloads:create', 'products:access'], lacks: ['devices:manage', 'billing:manage', 'members:invite', 'apikeys:manage', 'audit:read'] },
      AUDITOR: { has: ['audit:read', 'dashboard:read'], lacks: ['downloads:create', 'devices:manage', 'billing:manage', 'org:update', 'members:invite'] },
    };
    for (const role of MEMBER_ROLES) {
      const perms = await permissionsOf(members[role]);
      for (const p of matrix[role].has) expect(perms, `${role} should have ${p}`).toContain(p);
      for (const p of matrix[role].lacks) expect(perms, `${role} should NOT have ${p}`).not.toContain(p);
    }
  });

  it('are enforced by the routes, not just reported by /me', async () => {
    const { owner, members } = await orgWithAllRoles();

    // Everyone in the org can read it and see the member list.
    for (const u of [owner, ...Object.values(members)]) {
      expect((await call(u, 'GET', '/v1/orgs/me')).statusCode).toBe(200);
      expect((await call(u, 'GET', '/v1/orgs/me/members')).statusCode).toBe(200);
    }
    // Only the owner can invite, rename the org, or manage members.
    for (const role of MEMBER_ROLES) {
      const u = members[role];
      expect((await call(u, 'POST', '/v1/orgs/me/invites', { email: uniqueEmail(), roles: ['STANDARD_USER'] })).statusCode, `${role} invite`).toBe(403);
      expect((await call(u, 'PATCH', '/v1/orgs/me', { name: 'Hijacked' })).statusCode, `${role} rename`).toBe(403);
      expect((await call(u, 'GET', '/v1/orgs/me/invites')).statusCode, `${role} list invites`).toBe(403);
    }
    // The audit log: owner and auditor only.
    expect((await call(owner, 'GET', '/v1/orgs/me/audit')).statusCode).toBe(200);
    expect((await call(members.AUDITOR, 'GET', '/v1/orgs/me/audit')).statusCode).toBe(200);
    for (const role of ['BILLING_ADMIN', 'IT_ADMIN', 'STANDARD_USER'] as const) {
      expect((await call(members[role], 'GET', '/v1/orgs/me/audit')).statusCode, `${role} audit`).toBe(403);
    }
    // Not signed in at all.
    expect((await call(null, 'GET', '/v1/orgs/me')).statusCode).toBe(401);
  });

  it('keep a member without an org on individual permissions only', async () => {
    const loner = await createUser(app);
    const perms = await permissionsOf(loner);
    expect(perms).toContain('downloads:create');
    expect(perms).not.toContain('org:read');
    expect((await call(loner, 'GET', '/v1/orgs/me')).statusCode).toBe(403);
  });
});

describe('invitations', () => {
  it('can only be accepted by the invited address, once, before they expire', async () => {
    const owner = await createUser(app);
    await call(owner, 'POST', '/v1/orgs', { name: 'Invite Co' });

    const invited = await createUser(app);
    await call(owner, 'POST', '/v1/orgs/me/invites', { email: invited.email, roles: ['STANDARD_USER'] });
    const token = tokenFromMail(invited.email, 'invited');

    // Wrong account
    const stranger = await createUser(app);
    const wrong = await call(stranger, 'POST', '/v1/invites/accept', { token });
    expect(wrong.statusCode).toBe(403);
    expect(wrong.json().code).toBe('WRONG_ACCOUNT');

    // Right account, then a second use of the same link
    expect((await call(invited, 'POST', '/v1/invites/accept', { token })).statusCode).toBe(200);
    expect((await call(invited, 'POST', '/v1/invites/accept', { token })).statusCode).toBe(400);

    // Expired
    const late = await createUser(app);
    await call(owner, 'POST', '/v1/orgs/me/invites', { email: late.email, roles: ['AUDITOR'] });
    const lateToken = tokenFromMail(late.email, 'invited');
    await prisma.invite.update({ where: { tokenHash: sha256(lateToken) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await call(late, 'POST', '/v1/invites/accept', { token: lateToken })).statusCode).toBe(400);
  });

  it('cannot move someone who already belongs to an org, or invite an existing member', async () => {
    const ownerA = await createUser(app);
    await call(ownerA, 'POST', '/v1/orgs', { name: 'Org A' });
    const member = await createUser(app);
    await inviteAndAccept(ownerA, member, ['STANDARD_USER']);

    const dupe = await call(ownerA, 'POST', '/v1/orgs/me/invites', { email: member.email, roles: ['IT_ADMIN'] });
    expect(dupe.statusCode).toBe(409);
    expect(dupe.json().code).toBe('ALREADY_MEMBER');

    const ownerB = await createUser(app);
    await call(ownerB, 'POST', '/v1/orgs', { name: 'Org B' });
    await call(ownerB, 'POST', '/v1/orgs/me/invites', { email: member.email, roles: ['IT_ADMIN'] });
    const res = await call(member, 'POST', '/v1/invites/accept', { token: tokenFromMail(member.email, 'invited') });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('ALREADY_IN_ORG');
  });

  it('can be listed and cancelled, and a cancelled link stops working', async () => {
    const owner = await createUser(app);
    await call(owner, 'POST', '/v1/orgs', { name: 'Cancel Co' });
    const target = await createUser(app);
    const created = await call(owner, 'POST', '/v1/orgs/me/invites', { email: target.email, roles: ['STANDARD_USER'] });
    const token = tokenFromMail(target.email, 'invited');

    const list = await call(owner, 'GET', '/v1/orgs/me/invites');
    expect(list.json().invites).toHaveLength(1);
    expect((await call(owner, 'DELETE', `/v1/orgs/me/invites/${created.json().id}`)).statusCode).toBe(204);
    expect((await call(target, 'POST', '/v1/invites/accept', { token })).statusCode).toBe(400);
  });
});

describe('member management', () => {
  it('never leaves an organisation without an owner', async () => {
    const { owner, members } = await orgWithAllRoles();
    const ownerId = (await call(owner, 'GET', '/v1/me')).json().id as string;
    const standardId = (await call(members.STANDARD_USER, 'GET', '/v1/me')).json().id as string;

    const demote = await call(owner, 'PATCH', `/v1/orgs/me/members/${ownerId}`, { roles: ['IT_ADMIN'] });
    expect(demote.statusCode).toBe(409);
    expect(demote.json().code).toBe('LAST_OWNER');
    expect((await call(owner, 'POST', '/v1/orgs/me/leave')).statusCode).toBe(409);
    expect((await call(owner, 'DELETE', `/v1/orgs/me/members/${ownerId}`)).statusCode).toBe(409);

    // Promote a second owner; now the first can step down.
    expect((await call(owner, 'PATCH', `/v1/orgs/me/members/${standardId}`, { roles: ['ORG_OWNER'] })).statusCode).toBe(200);
    expect((await call(owner, 'PATCH', `/v1/orgs/me/members/${ownerId}`, { roles: ['IT_ADMIN'] })).statusCode).toBe(200);
    expect(await permissionsOf(owner)).not.toContain('billing:manage');
  });

  it('applies role changes immediately, and removal returns the person to an individual account', async () => {
    const { owner, members } = await orgWithAllRoles();
    const itId = (await call(members.IT_ADMIN, 'GET', '/v1/me')).json().id as string;

    // IT admin is promoted to billing admin: effect is immediate, with the same login token.
    expect((await call(owner, 'PATCH', `/v1/orgs/me/members/${itId}`, { roles: ['BILLING_ADMIN'] })).statusCode).toBe(200);
    const perms = await permissionsOf(members.IT_ADMIN);
    expect(perms).toContain('billing:manage');
    expect(perms).not.toContain('devices:manage');

    // A person can hold more than one role.
    expect((await call(owner, 'PATCH', `/v1/orgs/me/members/${itId}`, { roles: ['BILLING_ADMIN', 'IT_ADMIN'] })).statusCode).toBe(200);
    const both = await permissionsOf(members.IT_ADMIN);
    expect(both).toContain('billing:manage');
    expect(both).toContain('devices:manage');

    // Removal
    expect((await call(owner, 'DELETE', `/v1/orgs/me/members/${itId}`)).statusCode).toBe(204);
    const me = (await call(members.IT_ADMIN, 'GET', '/v1/me')).json();
    expect(me.org).toBeNull();
    expect(me.permissions).not.toContain('org:read');
    expect((await call(members.IT_ADMIN, 'GET', '/v1/orgs/me')).statusCode).toBe(403);
  });

  it('lets a non-owner leave on their own', async () => {
    const { members } = await orgWithAllRoles();
    expect((await call(members.AUDITOR, 'POST', '/v1/orgs/me/leave')).statusCode).toBe(204);
    expect((await call(members.AUDITOR, 'GET', '/v1/me')).json().org).toBeNull();
  });
});

describe('organisation-wide MFA', () => {
  it('needs the owner to have MFA first, then forces members to enrol', async () => {
    const owner = await createUser(app);
    await call(owner, 'POST', '/v1/orgs', { name: 'Secure Co' });
    const member = await createUser(app);
    await inviteAndAccept(owner, member, ['STANDARD_USER']);

    const early = await call(owner, 'PATCH', '/v1/orgs/me', { mfaRequired: true });
    expect(early.statusCode).toBe(409);
    expect(early.json().code).toBe('ENABLE_YOUR_OWN_MFA_FIRST');

    await enableMfa(app, owner);
    expect((await call(owner, 'PATCH', '/v1/orgs/me', { mfaRequired: true })).statusCode).toBe(200);

    // The member is blocked from the org routes, but can still see /me and set up MFA.
    const blocked = await call(member, 'GET', '/v1/orgs/me');
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().code).toBe('MFA_ENROLMENT_REQUIRED');
    const me = (await call(member, 'GET', '/v1/me')).json();
    expect(me.mfaEnrolmentRequired).toBe(true);
    await enableMfa(app, member);
    expect((await call(member, 'GET', '/v1/orgs/me')).statusCode).toBe(200);
  });
});

describe('audit trail', () => {
  it('records organisation events and pages through them', async () => {
    const { owner, members } = await orgWithAllRoles();
    const res = await call(members.AUDITOR, 'GET', '/v1/orgs/me/audit?limit=100');
    expect(res.statusCode).toBe(200);
    const actions = (res.json().events as { action: string; id: string }[]).map((e) => e.action);
    expect(actions).toContain('org.created');
    expect(actions).toContain('org.invite_created');
    expect(actions).toContain('org.invite_accepted');
    expect(typeof res.json().events[0].id).toBe('string'); // BigInt ids are serialised as strings

    const page1 = (await call(owner, 'GET', '/v1/orgs/me/audit?limit=2')).json();
    expect(page1.events).toHaveLength(2);
    const page2 = (await call(owner, 'GET', `/v1/orgs/me/audit?limit=2&before=${page1.nextBefore}`)).json();
    expect(page2.events[0].id).not.toBe(page1.events[0].id);
    expect(BigInt(page2.events[0].id)).toBeLessThan(BigInt(page1.nextBefore));
  });
});
