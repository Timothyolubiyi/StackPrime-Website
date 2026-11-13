export type Permission =
  | 'org:read' | 'org:update' | 'members:invite' | 'members:manage'
  | 'billing:read' | 'billing:manage' | 'entitlements:manage'
  | 'products:access' | 'downloads:create' | 'devices:read'
  | 'devices:manage' | 'apikeys:manage' | 'dashboard:read'
  | 'audit:read' | 'support:use';

export interface Me {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  isStaff: boolean;
  roles: string[];
  org: { id: string; name: string; mfaRequired?: boolean } | null;
  mfaEnrolmentRequired: boolean;
  permissions: Permission[];
}
export interface Price {
  currency: string;
  amountMinor: number;
  purchasable: boolean;
}
export interface Plan {
  code: string;
  name: string;
  billingModel: string;
  interval: string;
  endpointLimit: number | null;
  prices: Price[];
}
export interface Product {
  slug: string;
  name: string;
  tagline?: string | null;
  description: string;
  launchUrl?: string | null;
  features: string[];
  plans: Plan[];
  latestVersion?: { version: string; changelog?: string; publishedAt: string; platforms?: unknown[] } | null;
}
