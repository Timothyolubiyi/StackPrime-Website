# sp-saas-platform

Phase 3 SaaS platform for StackPrime (`app.stackprimeconsulting.com.ng`). See `PHASE3-SAAS-PLATFORM-SCOPE.md` (v2) at the repo root.

```
sp-saas-platform/
  api/      Fastify + TypeScript + Prisma API   (identity layer done; later steps listed below)
  deploy/   docker-compose, nginx, backup and cert scripts for the 1 GB droplet
```

## Build status (scope section 7)

| Step | Status |
|---|---|
| 1 Identity: signup, verify, login, refresh rotation, reset, MFA, sessions | **Done: typecheck clean, 9/9 tests pass, email verified through real SMTP** |
| 2 Org model + RBAC: create org, invites, roles, member management, org MFA, org audit log | **Written, not yet run** (`test/orgs.test.ts`) |
| 3 Catalog: public catalog API, staff admin (versions, files, publish, prices), seed | **Written, not yet run** (`test/catalog.test.ts`) |
| 4 Billing + entitlements | **Paystack-first backend added; requires migration, Paystack configuration, and integration testing** |
| 5 Licensed downloads | Schema only |
| 6 Device registry + agent API | Schema only |
| 7 Frontend, 8 Agents, 9 API keys, 10 Marketing integration, 11 Raphael | Not started |

## Run it locally

Requirements: Node 22+, Docker.

```bash
cd sp-saas-platform/api
cp .env.example .env            # fill JWT_SECRET and MFA_ENC_KEY (openssl rand -base64 48 / 32)
docker run -d --name sp-pg -e POSTGRES_USER=sp -e POSTGRES_PASSWORD=sp -e POSTGRES_DB=sp_saas -p 5432:5432 postgres:16-alpine
docker run -d --name sp-redis -p 6379:6379 redis:7-alpine
npm install                      # creates package-lock.json: commit it
npx prisma migrate dev --name init   # creates prisma/migrations: commit them
npm run db:immutable-audit       # audit-log trigger
npx prisma db execute --file prisma/sql/constraints.sql --schema prisma/schema.prisma
npm run dev                      # http://localhost:4000/healthz
```

With `SMTP_HOST` unset, outgoing email (verification and reset links) is printed to the API console in development.

### Tests

```bash
docker exec sp-pg psql -U sp -d sp_saas -c 'CREATE DATABASE sp_saas_test'
DATABASE_URL=postgresql://sp:sp@localhost:5432/sp_saas_test npx prisma migrate deploy
npm test
```

## Identity API (all under `/v1`)

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/signup` | Always `202`; never reveals if the email exists |
| POST | `/auth/verify-email` | `{ token }`, single use, 24 h |
| POST | `/auth/resend-verification` | `{ email }` |
| POST | `/auth/login` | `{ email, password, totp? , recoveryCode? }` returns `accessToken` (15 min) and sets the `sp_rt` refresh cookie |
| POST | `/auth/refresh` | Cookie only. Rotates the token; replay of an old token revokes the session |
| POST | `/auth/logout`, `/auth/logout-all` | |
| POST | `/auth/forgot-password`, `/auth/reset-password` | 1 h, single use; reset signs out every session |
| POST | `/auth/change-password` | Signs out other devices |
| GET / DELETE | `/auth/sessions`, `/auth/sessions/:id` | List and revoke |
| POST | `/auth/mfa/setup`, `/auth/mfa/enable`, `/auth/mfa/disable` | TOTP + 10 one-time recovery codes |
| GET | `/me` | User, org, roles, permission strings |
| GET | `/healthz`, `/readyz` | Liveness / readiness |

## Catalog API (all under `/v1`)

| Method | Path | Needs |
|---|---|---|
| GET | `/catalog`, `/catalog/:slug` | Nothing (public, cached 60 s). Never exposes Stripe ids, storage keys or checksums |
| PATCH | `/admin/products/:slug` | Staff with MFA |
| PATCH | `/admin/plans/:id` | Staff with MFA: legacy plan fields and endpoint limit |
| PUT | `/admin/plans/:id/prices/:currency` | Staff with MFA: Paystack currency-specific price and recurring plan code |
| POST | `/admin/products/:slug/versions` | Staff with MFA: creates a draft |
| POST / DELETE | `/admin/versions/:id/artifacts`, `/admin/artifacts/:id` | Staff with MFA, drafts only |
| POST | `/admin/versions/:id/publish` | Staff with MFA: needs at least one file; immutable afterwards |

Make an account staff with `npm run make-staff -- you@example.com`, then enable MFA on it. Seed the two products with `npm run seed`.

## Billing API (all under `/v1`)

| Method | Path | Needs |
|---|---|---|
| POST | `/billing/checkout` | `billing:manage`; creates Paystack checkout |
| GET | `/billing/verify/:reference` | Signed-in payment owner; server-side verification |
| POST | `/billing/webhooks/paystack` | Paystack HMAC-SHA512 signature |
| GET | `/billing/me` | `billing:read`; subscription and payment history |
| GET | `/billing/subscriptions/:id/manage-link` | `billing:manage`; Paystack-hosted card-update link |
| POST | `/billing/subscriptions/:id/resume` | `billing:manage`; re-enable a past-due subscription |
| POST | `/billing/subscriptions/:id/cancel` | `billing:manage`; stops future Paystack renewals |
| PUT | `/admin/plans/:id/prices/:currency` | Staff with MFA; configure a Paystack price |

See the Paystack-first billing section below for configuration and payload details.

## Organisation API (all under `/v1`)

| Method | Path | Needs |
|---|---|---|
| POST | `/orgs` | Any signed-in user without an org; becomes ORG_OWNER |
| GET / PATCH | `/orgs/me` | `org:read` / `org:update` (name, `mfaRequired`) |
| GET | `/orgs/me/members` | `org:read` |
| PATCH / DELETE | `/orgs/me/members/:userId` | `members:manage` (never removes the last owner) |
| POST | `/orgs/me/leave` | `org:read` |
| POST / GET | `/orgs/me/invites` | `members:invite` (token only goes by email) |
| DELETE | `/orgs/me/invites/:id` | `members:invite` |
| POST | `/invites/accept` | Signed in with the invited email address |
| GET | `/orgs/me/audit?limit&before` | `audit:read` |

Security choices worth knowing: passwords are SHA-256 pre-hashed then bcrypt (cost 12); TOTP secrets are AES-256-GCM encrypted at rest; each request re-checks the session row in Postgres, so revocation is immediate; failed logins lock an email for 15 minutes after 8 failures.

## Deploy

See `deploy/` and the CI workflows at the repo root (`.github/workflows/sp-saas-*.yml`).


## Billing (Paystack-first)

The gateway-neutral billing schema separates `Subscription` lifecycle records from
individual `Payment` attempts/charges. `PlanPrice` stores currency-specific prices;
`PaymentEvent` provides provider-event idempotency. Existing Stripe identifiers,
`StripeEvent`, and historical `EntitlementSource.STRIPE` values are retained for
backward compatibility. Stripe checkout is not exposed or enabled in this release.

### Configure

Set `PAYSTACK_ENABLED=true` and `PAYSTACK_SECRET_KEY` in the API environment.
Use Paystack test credentials first. Keep `STRIPE_ENABLED=false`. The Paystack
secret key must remain server-side and must never be sent to the browser. The Paystack
subscription email token is encrypted at rest using the existing AES-256-GCM secret key.

Apply the migration with `npx prisma migrate deploy`, then regenerate the client
with `npx prisma generate`. Restart the API after changing environment variables.

### Configure a plan price

A staff account with MFA can configure a price:

`PUT /v1/admin/plans/:planId/prices/:currency`

```json
{
  "amountMinor": 250000,
  "paystackPlanCode": "PLN_example"
}
```

`amountMinor` is the smallest currency unit (for NGN, kobo). For recurring
subscription plans, create the matching recurring plan in Paystack first and
supply its `paystackPlanCode`. Checkout fetches the provider plan and checks its
amount, currency and interval against the local price before redirecting. For perpetual/one-time plans, omit the plan code.

### Customer endpoints

- `POST /v1/billing/checkout` — authenticated billing manager; body `{ "planId": "...", "currency": "NGN" }`; returns a Paystack authorization URL.
- `GET /v1/billing/verify/:reference` — authenticated owner verifies a transaction and refreshes its payment/entitlement state.
- `POST /v1/billing/webhooks/paystack` — public provider callback; validates Paystack HMAC-SHA512 against the exact raw request body and de-duplicates event IDs.
- `GET /v1/billing/me` — lists the caller's subscriptions and payment history.
- `GET /v1/billing/subscriptions/:id/manage-link` — obtains a Paystack-hosted card-update link.
- `POST /v1/billing/subscriptions/:id/resume` — re-enables a past-due Paystack subscription after its payment method is fixed.
- `POST /v1/billing/subscriptions/:id/cancel` — billing manager disables future Paystack renewals; access remains valid through the paid period end.

A successful verified charge creates or refreshes an active entitlement. Recurring
renewal charges are stored as separate Payment rows and update the single
subscription entitlement. A failed recurring charge marks the subscription
`PAST_DUE` and grants a five-day grace window. Paystack does not automatically retry
failed subscription charges; customers can use the hosted subscription-management
link to update their card or direct-debit authorization, then contact support or
start a new checkout after resolving the payment issue. Recurring Paystack billing
is limited to the payment methods supported for subscriptions on the merchant's account. Reconcile webhook delivery and
transaction status from the Paystack dashboard before enabling live payments.

### Operational notes

- Configure webhook URL as `https://<api-host>/v1/billing/webhooks/paystack`.
- Do not rely on the browser redirect as proof of payment; use signed webhooks or
  server-to-server transaction verification.
- Keep the Stripe schema fields and event records until all legacy dependencies
  and historical data have been explicitly migrated.
- The Stripe adapter is deliberately disabled and not yet wired to checkout.
