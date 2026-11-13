-- Gateway-neutral billing foundation. Existing Stripe columns/tables remain intact.
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK', 'STRIPE');
CREATE TYPE "PaymentStatus" AS ENUM ('INITIALIZED', 'PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

ALTER TYPE "EntitlementSource" ADD VALUE IF NOT EXISTS 'PAYMENT';

CREATE TABLE "PlanPrice" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
  "currency" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "paystackPlanCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlanPrice_amount_positive" CHECK ("amountMinor" > 0),
  CONSTRAINT "PlanPrice_currency_format" CHECK ("currency" ~ '^[A-Z]{3}$')
);
CREATE UNIQUE INDEX "PlanPrice_planId_provider_currency_key" ON "PlanPrice"("planId", "provider", "currency");
CREATE INDEX "PlanPrice_provider_currency_isActive_idx" ON "PlanPrice"("provider", "currency", "isActive");
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "orgId" TEXT,
  "userId" TEXT,
  "planId" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "currency" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "interval" "BillingInterval" NOT NULL,
  "providerCustomerCode" TEXT,
  "providerSubscriptionCode" TEXT,
  "providerEmailToken" TEXT,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "gracePeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subscription_amount_positive" CHECK ("amountMinor" > 0),
  CONSTRAINT "Subscription_owner_xor" CHECK ((("orgId" IS NOT NULL)::int + ("userId" IS NOT NULL)::int) = 1)
);
CREATE UNIQUE INDEX "Subscription_providerSubscriptionCode_key" ON "Subscription"("providerSubscriptionCode");
CREATE INDEX "Subscription_orgId_status_idx" ON "Subscription"("orgId", "status");
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");
CREATE INDEX "Subscription_customerEmail_planId_provider_status_idx" ON "Subscription"("customerEmail", "planId", "provider", "status");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "provider" "PaymentProvider" NOT NULL,
  "providerReference" TEXT NOT NULL,
  "amountMinor" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'INITIALIZED',
  "authorizationUrl" TEXT,
  "paidAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_amount_positive" CHECK ("amountMinor" > 0)
);
CREATE UNIQUE INDEX "Payment_providerReference_key" ON "Payment"("providerReference");
CREATE INDEX "Payment_subscriptionId_createdAt_idx" ON "Payment"("subscriptionId", "createdAt");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentEvent_provider_eventId_key" ON "PaymentEvent"("provider", "eventId");
CREATE INDEX "PaymentEvent_processedAt_receivedAt_idx" ON "PaymentEvent"("processedAt", "receivedAt");

ALTER TABLE "Entitlement" ADD COLUMN "subscriptionId" TEXT;
ALTER TABLE "Entitlement" ADD COLUMN "paymentId" TEXT;
CREATE UNIQUE INDEX "Entitlement_subscriptionId_key" ON "Entitlement"("subscriptionId");
CREATE UNIQUE INDEX "Entitlement_paymentId_key" ON "Entitlement"("paymentId");
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
