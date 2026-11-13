import type { BillingInterval, EntitlementStatus, Prisma } from '@prisma/client';

type Owner = { id: string; orgId: string | null };

/** Who owns purchases: the organisation, or the individual if they are not in one. */
export const ownerOf = (u: Owner): { orgId: string } | { userId: string } => (u.orgId ? { orgId: u.orgId } : { userId: u.id });

export const activeEntitlementWhere = (u: Owner, productId: string, now = new Date()): Prisma.EntitlementWhereInput => ({
  ...ownerOf(u),
  productId,
  status: 'ACTIVE',
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

export type EntitlementState = 'active' | 'cancelling' | 'expired' | 'cancelled' | 'pending';

export function entitlementState(
  e: { status: EntitlementStatus; expiresAt: Date | null; cancelledAt: Date | null },
  now = new Date(),
): EntitlementState {
  if (e.status === 'PENDING') return 'pending';
  if (e.status === 'CANCELLED') return 'cancelled';
  if (e.status === 'EXPIRED' || (e.expiresAt && e.expiresAt <= now)) return 'expired';
  return e.cancelledAt ? 'cancelling' : 'active'; // "cancelling": paid up, will not renew
}

/** The one question every download, agent and API call asks. */
export const isEntitled = (e: Parameters<typeof entitlementState>[0], now = new Date()) => {
  const s = entitlementState(e, now);
  return s === 'active' || s === 'cancelling';
};

// A paid subscription period plus a few days of grace for slow renewals.
export const GRACE_DAYS = 3;
const PERIOD_DAYS: Record<BillingInterval, number | null> = { MONTH: 31, YEAR: 366, ONE_TIME: null };

export function expiryFor(interval: BillingInterval, from = new Date()): Date | null {
  const days = PERIOD_DAYS[interval];
  return days == null ? null : new Date(from.getTime() + (days + GRACE_DAYS) * 24 * 60 * 60 * 1000);
}
