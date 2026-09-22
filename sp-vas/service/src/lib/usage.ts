import type { PrismaClient } from "@prisma/client";

export const FREE_USE_LIMIT = 3;

export type UsageCheck =
  | { allowed: true; usesRemaining: number }
  | { allowed: false; reason: "limit_reached" };

// Deliberately simple: fingerprint + IP, no email gate. Per project
// decision, the free report itself plus this upgrade prompt at the 4th
// attempt is the intended lead-gen mechanism — no soft email wall before
// that.
export async function checkUsage(
  prisma: PrismaClient,
  fingerprint: string,
  ipAddress: string
): Promise<UsageCheck> {
  const count = await prisma.toolUsage.count({
    where: { OR: [{ fingerprint }, { ipAddress }] },
  });

  if (count >= FREE_USE_LIMIT) {
    return { allowed: false, reason: "limit_reached" };
  }
  return { allowed: true, usesRemaining: FREE_USE_LIMIT - count };
}

export async function recordUsage(
  prisma: PrismaClient,
  data: { fingerprint: string; ipAddress: string; target: string; riskGrade: string; riskScore: number; reportPath?: string }
) {
  return prisma.toolUsage.create({ data });
}
