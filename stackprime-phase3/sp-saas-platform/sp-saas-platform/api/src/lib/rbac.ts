import type { Role } from '@prisma/client';

export const ROLES = ['ORG_OWNER', 'BILLING_ADMIN', 'IT_ADMIN', 'STANDARD_USER', 'AUDITOR'] as const satisfies readonly Role[];

export const PERMISSIONS = [
  'org:read',
  'org:update',
  'members:invite',
  'members:manage', // change roles, remove members
  'billing:read',
  'billing:manage',
  'entitlements:manage',
  'products:access', // see product pages inside the platform
  'downloads:create',
  'devices:read',
  'devices:manage', // enrolment tokens, revoke
  'apikeys:manage',
  'dashboard:read',
  'audit:read',
  'support:use',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Matches the role table in the scope (section 4.2). Capabilities are always checked through these
// permission strings in route handlers, never by comparing role names.
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // Everything. Owner is implicitly also IT Admin.
  ORG_OWNER: PERMISSIONS,
  // Billing and subscriptions only; no product access.
  BILLING_ADMIN: ['org:read', 'billing:read', 'billing:manage', 'support:use'],
  // Product access, downloads, agent deployment; no billing or roles.
  IT_ADMIN: ['org:read', 'products:access', 'downloads:create', 'devices:read', 'devices:manage', 'apikeys:manage', 'dashboard:read', 'support:use'],
  // Product access and downloads within entitlements; cannot manage anything.
  STANDARD_USER: ['org:read', 'products:access', 'downloads:create', 'dashboard:read', 'support:use'],
  // View-only; cannot download or change settings.
  AUDITOR: ['org:read', 'dashboard:read', 'audit:read', 'devices:read', 'support:use'],
};

// An individual (no organisation) account manages its own purchases and downloads.
const INDIVIDUAL_PERMISSIONS: readonly Permission[] = ['billing:read', 'billing:manage', 'products:access', 'downloads:create', 'dashboard:read', 'support:use'];

export function permissionsFor(user: { orgId: string | null; roles: Role[] }): Set<Permission> {
  if (!user.orgId) return new Set(INDIVIDUAL_PERMISSIONS);
  const out = new Set<Permission>();
  for (const r of user.roles) for (const p of ROLE_PERMISSIONS[r]) out.add(p);
  return out;
}
