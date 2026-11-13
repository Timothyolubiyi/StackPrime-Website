export type Role = 'ORG_OWNER' | 'BILLING_ADMIN' | 'IT_ADMIN' | 'STANDARD_USER' | 'AUDITOR';

export interface Me {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  isStaff: boolean;
  roles: Role[];
  org: { id: string; name: string; mfaRequired: boolean } | null;
  mfaEnrolmentRequired: boolean;
  permissions: string[];
}

export interface Price { currency: string; amountMinor: number; purchasable: boolean }
export interface Plan { code: string; name: string; billingModel: string; interval: string; endpointLimit: number | null; prices: Price[] }
export interface Product {
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  launchUrl: string | null;
  features: string[];
  plans: Plan[];
  latestVersion: { version: string; platforms: { platform: string; arch: string; filename: string; sizeBytes: number }[] } | null;
}

export type EntitlementState = 'active' | 'cancelling' | 'expired' | 'cancelled' | 'pending';
export interface Entitlement {
  id: string;
  product: { slug: string; name: string };
  plan: { code: string; name: string; interval: string };
  state: EntitlementState;
  source: string;
  endpointLimit: number | null;
  startsAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  licenseKey: string | null;
}

export interface Payment { reference: string; status: string; product: string; plan: string; currency: string; amountMinor: number; createdAt: string; paidAt: string | null }
export interface PurchaseOrder { id: string; status: string; product: string; plan: string; quantity: number; reference: string | null; createdAt: string }
export interface Member { id: string; email: string; name: string | null; roles: Role[]; mfaEnabled: boolean }
export interface Invite { id: string; email: string; roles: Role[]; expiresAt: string; createdAt: string }
export interface AuditEvent { id: string; at: string; action: string; actorId: string | null; targetType: string | null; targetId: string | null; ip: string | null }
export interface SessionRow { id: string; userAgent: string | null; ip: string | null; createdAt: string; lastUsedAt: string; current: boolean }

export interface AdminPlan {
  id: string; code: string; name: string; billingModel: string; interval: string; endpointLimit: number | null; isActive: boolean;
  prices: { currency: string; amountMinor: number; isActive: boolean; hasProviderPlan: boolean }[];
}
export interface AdminProduct { id: string; slug: string; name: string; isActive: boolean; plans: AdminPlan[] }
export interface AdminPurchaseOrder { id: string; status: string; org: string; orgId: string; product: string; plan: string; quantity: number; reference: string | null; notes: string | null; createdAt: string }
