# sp-saas-platform

The StackPrime SaaS platform (Phase 3): accounts, organisations, a product catalog, billing and licensed downloads for every StackPrime product. It runs at `app.stackprimeconsulting.com.ng`.

The full scope is in `PHASE3-SAAS-PLATFORM-SCOPE.md` (v2) at the repo root. Mobile apps are **Phase 4**, not part of this folder.

```
sp-saas-platform/
  api/      Fastify 5 + TypeScript + Prisma 5 API (Postgres, Redis)
  deploy/   docker-compose, nginx, backup and certificate scripts for the 1 GB droplet
../terraform/sp-saas-platform/   droplet, firewall, private Spaces buckets
../.github/workflows/sp-saas-*.yml   CI, deploy, manual Terraform
```

## Build status

The build follows the order in the scope (section 7). Each step is tested before the next begins.

| Step | What it is | Status |
|---|---|---|
| 1 | **Identity**: signup, email verification, login, refresh-token rotation with theft detection, password reset, TOTP MFA with recovery codes, session list and revoke | Done. Tested. |
| 2 | **Organisations and roles**: create an org, invite by email, five roles, member management, never-zero-owners rule, org-wide MFA requirement, org audit log | Done. Tested. |
| 3 | **Product catalog**: public catalog API, staff admin (draft, add files, publish, immutable), plans, seed for SP VAS Premium and SP Fast Enterprise | Done. Tested. |
| 4 | **Billing and entitlements** on **Paystack**: checkout, verify, signed webhooks, subscriptions and renewals, cancel, perpetual licences, purchase-order (invoice) path, manual grants | Written. **Run the tests and send me the result** (`test/billing.test.ts`). |
| 5 | Licensed downloads: entitlement check, short-lived signed URL, download log | Not started. Schema and storage layout exist. |
| 6 | Device registry and agent API: enrolment tokens, heartbeat, endpoint limits, revoke | Not started. Schema exists. |
| 7 | Platform web front end (React) | Not started. |
| 8 | Desktop agents for SP VAS and SP Fast Enterprise (Go): Windows, Ubuntu/Debian, macOS, RPM, tar, container | Not started. |
| 9 | API keys | Not started. Schema exists. |
| 10 | Marketing-site integration (`/saas-products` reads the catalog) | Not started. Needs your approval before any existing file is edited. |
| 11 | Raphael, the AI support agent, with email hand-off to support@stackprimeconsulting.com.ng | Not started. |

Tests: `test/auth.test.ts`, `test/orgs.test.ts`, `test/catalog.test.ts`, `test/billing.test.ts`.

## Run it on your computer (Windows PowerShell)

You need Node 22 or newer and Docker Desktop (running). Paste commands one box at a time, **without** the `PS C:\...>` prompt text.

**1. Start the database, Redis and a fake mail inbox** (once; Docker keeps them afterwards):

```powershell
docker run -d --name sp-pg -e POSTGRES_USER=sp -e POSTGRES_PASSWORD=sp -e POSTGRES_DB=sp_saas -p 5432:5432 postgres:16-alpine
docker run -d --name sp-redis -p 6379:6379 redis:7-alpine
docker run -d --name sp-mail -p 1025:1025 -p 8025:8025 axllent/mailpit
docker exec sp-pg psql -U sp -d sp_saas -c "CREATE DATABASE sp_saas_test"
```

Later, `docker start sp-pg sp-redis sp-mail` brings them back after a restart. Emails the API sends appear at http://localhost:8025.

**2. Configure:**

```powershell
cd sp-saas-platform\api
copy .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Paste the first output into `JWT_SECRET` and the second into `MFA_ENC_KEY` in `.env`. For local email set `SMTP_HOST=localhost`, `SMTP_PORT=1025`, and leave `SMTP_USER` and `SMTP_PASS` empty.

**3. Install and create the database tables:**

```powershell
npm install
npx prisma migrate dev
npx prisma db execute --file prisma/sql/constraints.sql --schema prisma/schema.prisma
npx prisma db execute --file prisma/sql/audit_immutable.sql --schema prisma/schema.prisma
npm run seed
```

The two SQL files add protections Prisma cannot express: the audit log becomes append-only, and an entitlement must belong to exactly one of an organisation or a person. If `migrate dev` ever offers to reset your local database because of "drift", say yes, then run the two SQL files again.

**4. Start the API:**

```powershell
npm run dev
```

Leave that window running. Then open http://localhost:4000/v1/catalog in a browser. `http://localhost:4000/healthz` answers `{"status":"ok"}` and `/readyz` checks the database and Redis.

**5. Run the tests** (in a second window, after applying migrations to the test database once):

```powershell
$env:DATABASE_URL="postgresql://sp:sp@localhost:5432/sp_saas_test?schema=public"
npx prisma migrate deploy
Remove-Item Env:DATABASE_URL
npm run typecheck
npm test
```

Whenever a new migration appears, repeat the three test-database lines.

Make an account a StackPrime staff member with `npm run make-staff -- you@example.com`. Staff routes also require that account to have MFA on.

## Settings (`api/.env`)

| Name | Purpose |
|---|---|
| `APP_ORIGIN` | The front end's address. Used in email links and to restrict cross-site requests. |
| `DATABASE_URL`, `REDIS_URL` | Postgres and Redis. |
| `JWT_SECRET` | At least 32 characters. Signs login tokens. |
| `MFA_ENC_KEY` | 32 random bytes, base64. Encrypts MFA secrets in the database. |
| `SMTP_*`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | Zoho Mail in production. Everything sends from and notifies **support@stackprimeconsulting.com.ng**. |
| `PAYSTACK_SECRET_KEY` | `sk_test_...` everywhere except production. Without it, checkout answers 503 and everything else still works. |
| `SPACES_*` | The private installer bucket (used from Step 5). |
| `VAS_LAUNCH_URL`, `FAST_LAUNCH_URL` | Optional, only read by `npm run seed`. |

Never commit `.env`. The folder's `.gitignore` already excludes it.

## API reference (all paths under `/v1`)

Errors always look like `{ "code": "...", "message": "..." }`. Dates are ISO 8601. Money is in the smallest unit (kobo, cents).

### Identity (Step 1)

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/signup` | Always `202`; never reveals whether the email exists |
| POST | `/auth/verify-email`, `/auth/resend-verification` | Single-use link, 24 h |
| POST | `/auth/login` | `{ email, password, totp? , recoveryCode? }`. Returns a 15-minute `accessToken` and sets the `sp_rt` refresh cookie |
| POST | `/auth/refresh` | Cookie only. Rotates the token; replaying the previous one revokes the session |
| POST | `/auth/logout`, `/auth/logout-all` | |
| POST | `/auth/forgot-password`, `/auth/reset-password` | 1 h, single use; a reset signs out every session |
| POST | `/auth/change-password` | Signs out other devices |
| GET, DELETE | `/auth/sessions`, `/auth/sessions/:id` | List and revoke |
| POST | `/auth/mfa/setup`, `/auth/mfa/enable`, `/auth/mfa/disable` | TOTP plus 10 one-time recovery codes |
| GET | `/me` | The user, org, roles and permission strings |
| GET | `/healthz`, `/readyz` | Liveness and readiness |

Failed logins lock an email address for 15 minutes after 8 attempts.

### Organisations (Step 2)

| Method | Path | Needs |
|---|---|---|
| POST | `/orgs` | Any signed-in user not in an org; becomes the owner |
| GET, PATCH | `/orgs/me` | `org:read` / `org:update` (name, `mfaRequired`) |
| GET | `/orgs/me/members` | `org:read` |
| PATCH, DELETE | `/orgs/me/members/:userId` | `members:manage`. The last owner can never be removed or demoted |
| POST | `/orgs/me/leave` | Any member |
| POST, GET, DELETE | `/orgs/me/invites`, `/orgs/me/invites/:id` | `members:invite`. The token travels only by email |
| POST | `/invites/accept` | Signed in with the invited address |
| GET | `/orgs/me/audit?limit&before` | `audit:read` (owner and auditor) |

Roles (permissions are checked by name in the code, never by role name):

| Role | Can |
|---|---|
| Org Owner | Everything, including billing, roles, devices, API keys, audit |
| Billing Admin | Subscriptions and invoices only. No product access. |
| IT Admin | Product access, downloads, agents and API keys. No billing or roles. |
| Standard User | Product access and downloads within what the org has bought |
| Auditor | Read-only: dashboards, devices, audit log. Cannot download or change anything |

A person with no organisation manages their own purchases and downloads.

### Catalog (Step 3)

| Method | Path | Needs |
|---|---|---|
| GET | `/catalog`, `/catalog/:slug` | Nothing (public, cached for 60 s). Shows products, plans, prices per currency and the platforms of the latest version. Never exposes provider ids, storage paths or checksums. |
| PATCH | `/admin/products/:slug`, `/admin/plans/:id` | Staff with MFA |
| POST | `/admin/products/:slug/versions` | Staff: creates a draft |
| POST, DELETE | `/admin/versions/:id/artifacts`, `/admin/artifacts/:id` | Staff, drafts only. Android and iOS are rejected (Phase 4) |
| POST | `/admin/versions/:id/publish` | Staff: needs at least one file; immutable afterwards |

### Billing and entitlements (Step 4)

| Method | Path | Needs |
|---|---|---|
| PUT | `/admin/plans/:id/prices/:currency` | Staff: sets the amount (`{ "amountMinor": 2500000 }`). Changing it detaches the Paystack plan |
| POST | `/admin/plans/:id/prices/:currency/paystack-plan` | Staff: creates the matching plan on Paystack and stores its code |
| POST | `/billing/checkout` | `billing:manage`. `{ productSlug, planCode, currency }` returns `authorizationUrl` to send the customer to |
| GET | `/billing/verify?reference=` | `billing:manage`. Call when the customer returns; confirms the payment immediately |
| POST | `/webhooks/paystack` | Paystack only (signature checked). Register this URL in the Paystack dashboard |
| GET | `/entitlements` | Any signed-in member: what the account may use (`active`, `cancelling`, `expired`, `cancelled`) |
| GET | `/billing/payments` | `billing:read` |
| POST | `/billing/entitlements/:id/cancel` | `billing:manage`. Paid time is kept |
| GET | `/billing/entitlements/:id/manage-link` | `billing:manage`. Paystack's page for updating a card |
| POST, GET | `/billing/purchase-orders` | `billing:manage` / `billing:read`. Organisations that cannot pay by card |
| GET, POST | `/admin/purchase-orders`, `/:id/status`, `/:id/activate` | Staff: request, invoice, activate |
| POST | `/admin/entitlements`, `/admin/entitlements/:id/revoke` | Staff: manual grants and revocations; a written reason is required |

#### Setting up Paystack

1. In the Paystack dashboard (test mode first), copy the **secret key** into `PAYSTACK_SECRET_KEY`.
2. Set prices: `PUT /v1/admin/plans/<planId>/prices/NGN` with `{ "amountMinor": ... }`, and the same for `USD` if your account accepts dollars. Prices are not decided yet, so none are seeded.
3. For each subscription price, call `POST /v1/admin/plans/<planId>/prices/NGN/paystack-plan` once.
4. In the dashboard under Settings, API Keys and Webhooks, set the webhook URL to `https://app.stackprimeconsulting.com.ng/v1/webhooks/paystack`.
5. Before going live, confirm with Paystack that your account can take USD and which currency it settles in. That is an account matter, not a code one.

How a purchase flows: checkout records the payment as pending and returns Paystack's page; the customer pays; their return calls `/billing/verify`, and Paystack's webhook confirms it again. Whichever arrives first grants access; the second changes nothing. If the amount or currency charged differs from what was recorded, the payment is flagged for a person and nothing is granted. Subscription renewals arrive as webhooks and extend access. A subscription period is the paid time plus 3 days of grace.

## Security notes

- Passwords: SHA-256 pre-hash then bcrypt (cost 12); a login for an unknown email takes the same time as for a known one.
- TOTP secrets are AES-256-GCM encrypted in the database; each code works once; recovery codes are stored only as hashes.
- Every authenticated request re-checks the session in Postgres, so logout, revocation and role changes take effect immediately.
- The audit log is append-only at the database level.
- Webhook signatures use HMAC-SHA512 over the raw request body with constant-time comparison.
- The public catalog and error responses never include provider ids, storage keys or internal errors.
- Run `npm audit --omit=dev` regularly. It reports only what ships to the server.

## Deploying

See `deploy/README.md` for the one-time server setup and the GitHub secrets, and `.github/workflows/sp-saas-deploy.yml` for the automated rollout (with automatic rollback if the API does not come up). There is no staging environment (scope 5.6): test locally and with Paystack test keys first.

## If something goes wrong

| Symptom | Cause and fix |
|---|---|
| `http://localhost:4000` does not load | The API is not running. Start it with `npm run dev` and wait for the "listening" line. Check `docker ps` shows `sp-pg` and `sp-redis`. |
| "Invalid environment configuration" on start | `.env` is missing or incomplete. Compare it to `.env.example`. |
| `EPERM ... query_engine-windows.dll.node` | Another Node process has Prisma's file open. Stop the dev server (or `Stop-Process -Name node -Force`) and retry. |
| Prisma commands mention `prisma.config.ts` | Prisma 7 got installed. This project uses exactly Prisma 5.22.0: `npm install --save-exact prisma@5.22.0 @prisma/client@5.22.0`. |
| `package.json` fails to parse | A hand edit lost a comma. Restore the file from the repo. |
| Docker cannot download images | Check internet and DNS; set `"dns": ["8.8.8.8", "1.1.1.1"]` in Docker Desktop, Settings, Docker Engine. |
| Tests fail with "does not exist" for a column | The test database is behind. Apply migrations to it (step 5 above). |

## Decisions still open (scope section 10)

Prices for each plan and currency, endpoint-limit bands for SP Fast Enterprise, the exact scan scope of SP VAS Premium, the Paystack account's USD and settlement details, code-signing certificates for the agents, and Raphael's language-model provider. Mobile (Android and iOS) is Phase 4.
