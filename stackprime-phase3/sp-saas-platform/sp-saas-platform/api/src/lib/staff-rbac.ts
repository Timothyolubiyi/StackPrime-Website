import type { StaffRole } from '@prisma/client';

export const STAFF_PERMISSIONS = [
  'products:manage',
  'billing:manage',
  'staff:manage',
  'support:manage',
] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<StaffRole, readonly StaffPermission[]> = {
  SUPER_ADMIN: STAFF_PERMISSIONS,
  PRODUCT_ADMIN: ['products:manage'],
  BILLING_ADMIN: ['billing:manage'],
  SUPPORT_AGENT: ['support:manage'],
};

export function staffPermissionsFor(roles: readonly StaffRole[]): Set<StaffPermission> {
  const permissions = new Set<StaffPermission>();

  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      permissions.add(permission);
    }
  }

  return permissions;
}

export function hasStaffPermissions(
  roles: readonly StaffRole[],
  required: readonly StaffPermission[],
): boolean {
  const granted = staffPermissionsFor(roles);
  return required.every((permission) => granted.has(permission));
}
