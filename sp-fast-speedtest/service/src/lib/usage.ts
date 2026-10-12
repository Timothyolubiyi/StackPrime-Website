import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FREE_USE_LIMIT = 3;

// Safety net against bandwidth abuse, independent of the 3-use limit — see
// the schema.prisma comment on DailyTransfer for why both exist. 500MB/day
// per IP comfortably covers legitimate use (3 free tests x ~30MB each, plus
// headroom for shared/office IPs behind NAT) while bounding worst case.
const DAILY_BYTES_CAP = 500 * 1024 * 1024;

export async function checkUsage(fingerprint: string, ipAddress: string) {
  const count = await prisma.toolUsage.count({
    where: { OR: [{ fingerprint }, { ipAddress }] },
  });
  return { allowed: count < FREE_USE_LIMIT, usesRemaining: Math.max(0, FREE_USE_LIMIT - count) };
}

export async function recordUsage(fingerprint: string, ipAddress: string) {
  const row = await prisma.toolUsage.create({ data: { fingerprint, ipAddress } });
  return row.id;
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function checkDailyTransferCap(ipAddress: string, requestedBytes: number) {
  const date = todayUTC();
  const row = await prisma.dailyTransfer.findUnique({
    where: { ipAddress_date: { ipAddress, date } },
  });
  const usedSoFar = row?.bytes ?? 0;
  return { allowed: usedSoFar + requestedBytes <= DAILY_BYTES_CAP, usedSoFar };
}

export async function recordTransfer(ipAddress: string, bytes: number) {
  const date = todayUTC();
  await prisma.dailyTransfer.upsert({
    where: { ipAddress_date: { ipAddress, date } },
    create: { ipAddress, date, bytes },
    update: { bytes: { increment: bytes } },
  });
}

export async function saveResult(
  usageId: string,
  downloadMbps: number,
  uploadMbps: number,
  latencyMs: number
) {
  return prisma.speedTestResult.create({
    data: { usageId, downloadMbps, uploadMbps, latencyMs },
  });
}
