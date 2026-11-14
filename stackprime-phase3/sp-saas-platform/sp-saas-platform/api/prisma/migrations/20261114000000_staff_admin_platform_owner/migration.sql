-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPER_ADMIN', 'PRODUCT_ADMIN', 'BILLING_ADMIN', 'SUPPORT_AGENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPlatformOwner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "staffRoles" "StaffRole"[] DEFAULT ARRAY[]::"StaffRole"[],
ADD COLUMN     "staffSuspendedAt" TIMESTAMP(3);
