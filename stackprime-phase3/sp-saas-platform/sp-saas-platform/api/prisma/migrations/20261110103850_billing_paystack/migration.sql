/*
  Warnings:

  - You are about to drop the column `stripePaymentIntent` on the `Entitlement` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `Entitlement` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `Org` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `priceMinor` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `stripePriceId` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the `StripeEvent` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[providerSubscriptionCode]` on the table `Entitlement` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK', 'STRIPE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'FLAGGED');

-- AlterEnum
ALTER TYPE "EntitlementSource" ADD VALUE 'PAYSTACK';

-- DropIndex
DROP INDEX "Entitlement_stripePaymentIntent_key";

-- DropIndex
DROP INDEX "Entitlement_stripeSubscriptionId_key";

-- DropIndex
DROP INDEX "Org_stripeCustomerId_key";

-- DropIndex
DROP INDEX "Plan_stripePriceId_key";

-- AlterTable
ALTER TABLE "Entitlement" DROP COLUMN "stripePaymentIntent",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "nextPaymentAt" TIMESTAMP(3),
ADD COLUMN     "provider" "PaymentProvider",
ADD COLUMN     "providerCustomerCode" TEXT,
ADD COLUMN     "providerEmailToken" TEXT,
ADD COLUMN     "providerPlanCode" TEXT,
ADD COLUMN     "providerSubscriptionCode" TEXT;

-- AlterTable
ALTER TABLE "Org" DROP COLUMN "stripeCustomerId";

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "currency",
DROP COLUMN "priceMinor",
DROP COLUMN "stripePriceId";

-- DropTable
DROP TABLE "StripeEvent";

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPrice" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
    "providerPlanCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "reference" TEXT NOT NULL,
    "orgId" TEXT,
    "userId" TEXT,
    "planId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "providerPlanCode" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerTransactionId" TEXT,
    "entitlementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanPrice_planId_currency_key" ON "PlanPrice"("planId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPrice_provider_providerPlanCode_key" ON "PlanPrice"("provider", "providerPlanCode");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_orgId_createdAt_idx" ON "Payment"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_providerSubscriptionCode_key" ON "Entitlement"("providerSubscriptionCode");

-- CreateIndex
CREATE INDEX "Entitlement_providerCustomerCode_providerPlanCode_idx" ON "Entitlement"("providerCustomerCode", "providerPlanCode");

-- AddForeignKey
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "Entitlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
