import type { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export const HEARTBEAT_SECONDS = 300;
// A device that has not checked in for three intervals is shown as offline.
export const ONLINE_WINDOW_MS = HEARTBEAT_SECONDS * 3 * 1000;

/**
 * How many devices an organisation may run for a product: the SUM of the limits of its active
 * entitlements (two invoices of 40 devices allow 80). `null` means unlimited (some plan has no limit),
 * and `'none'` means there is no active entitlement at all.
 */
export async function endpointLimitFor(db: Db, orgId: string, productId: string): Promise<number | null | 'none'> {
  const now = new Date();
  const ents = await db.entitlement.findMany({
    where: { orgId, productId, status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    include: { plan: { select: { endpointLimit: true } } },
  });
  if (ents.length === 0) return 'none';
  let total = 0;
  for (const e of ents) {
    const limit = e.endpointLimit ?? e.plan.endpointLimit;
    if (limit === null) return null;
    total += limit;
  }
  return total;
}
