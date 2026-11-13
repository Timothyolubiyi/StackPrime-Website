-- An entitlement belongs to exactly one of: an organisation, or an individual user.
-- Idempotent: safe to run on every deploy.
ALTER TABLE "Entitlement" DROP CONSTRAINT IF EXISTS entitlement_owner_xor;
ALTER TABLE "Entitlement" ADD CONSTRAINT entitlement_owner_xor
  CHECK ((("orgId" IS NOT NULL)::int + ("userId" IS NOT NULL)::int) = 1);
