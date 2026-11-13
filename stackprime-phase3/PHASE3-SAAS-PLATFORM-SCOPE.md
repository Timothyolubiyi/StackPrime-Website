# Phase 3 Scope: SaaS Platform (v2)

**RC 9676973 — StackPrime Consulting Ltd**
**Domain: stackprimeconsulting.com.ng**
Status: build authorised. Step 1 (identity layer) onward is scaffolded in `sp-saas-platform/`. Nothing here is deployed yet.

---

## 0. Change log (v1 → v2)

| # | Change | Reason |
|---|---|---|
| 1 | **Desktop/server platform matrix widened** to Windows, Ubuntu/Debian, macOS, and "Others" (RHEL-family Linux, Linux ARM64, Docker image). | Requested platform coverage. |
| 2 | **macOS added to the SP VAS Desktop Agent** (was an open decision, v1 §8.8). | macOS is now a required platform. Confirm in §10. |
| 3 | **Android and iOS moved out of Phase 3** into a **Phase 4 addendum** (§11). | Mobile has different distribution, billing and background-execution rules. |
| 4 | **Device registry added** (§4.9): every agent install registers, is counted, and can be revoked. | Needed to enforce endpoint bands and to authenticate agents. |
| 5 | **Catalog artifacts are now per-platform and per-package-format** (§4.3). | `.msi`, `.pkg`, `.deb`, `.rpm`, `.tar.gz`, container image. |
| 6 | **No staging droplet for Phase 3** (§5.6). Replaced by a local Docker Compose environment with Paystack test mode. | Budget decision. |
| 7 | **Subdomain and bucket alignment with the marketing-site infra docs** (§5.5). | Two inconsistencies found between the v1 scope and `INFRASTRUCTURE.md`. |
| 8 | **Phase numbering conflict flagged** (§11.1). | `INFRASTRUCTURE.md` already assigns Phase 4 to the Training Academy. |
| 9 | **Repo conventions section added** (§12). | Hard rules from the repo's `CLAUDE.md` apply to all Phase 3 work. |
| 10 | **AI support agent "Raphael" added** (§4.10) with human hand-off to `support@stackprimeconsulting.com.ng`. Replaces the v1 "no in-app chat" exclusion. | Support requirement. |
| 11 | **Hosting decision: one dedicated 1 GB droplet (~$6)** running Postgres, Redis, API and Nginx in containers, with swap and memory caps (§5). Managed Postgres and the Redis droplet are removed. | Budget decision; upgrade path to 2 GB is one variable. |
| 12 | **Support sender and hand-off address is `support@stackprimeconsulting.com.ng`** (§4.10). Hand-off to a human is by email. | Confirmed. |
| 13 | **Payment provider changed from Stripe to Paystack** (§4.6). Plans carry one price per currency; the entitlement logic does not depend on the provider. | Stripe does not support Nigeria-registered businesses. |

---

## 1. What Phase 3 is

Phase 3 is the authenticated, enterprise-grade SaaS Platform that every paid tier across every StackPrime product plugs into. It is not a product itself. It is the shared foundation that makes multiple products commercially viable as software rather than one-off consulting engagements.

The upgrade prompt on SP VAS's 4th scan routes here. The "Ask About Premium" CTA on the SaaS Products page routes here. The "See SP Fast Enterprise" prompt on the speed-test result routes here.

**Subdomain:** `app.stackprimeconsulting.com.ng` (production only; no staging environment, see §5.6)

---

## 2. The three commercial tiers

### A. Self-serve account (individuals and small teams)
- Create an account on `app.stackprimeconsulting.com.ng`
- Browse the product catalog
- Purchase a subscription or one-time licence via Paystack (card; naira and dollar prices)
- Download licensed software immediately after successful payment
- Manage billing, download history, active licences and registered devices

### B. Organisation account (businesses, IT teams, enterprise)
- An Org Owner registers and creates an organisation
- Invites team members; roles control what each member can see, do and download
- Billing at org level (one Paystack subscription covering the org's entitlements)
- Purchase Order / invoice path for Nigerian enterprises and government clients who cannot pay by card

### C. Downloadable software purchases (perpetual licence model)
- Some products are sold once rather than by subscription
- Visitor pays once via Paystack, receives a perpetual licence key and a versioned download
- The download endpoint validates the licence before serving the file
- No recurring billing; paid upgrades between major versions

---

## 3. Products in Phase 3

Two products launch with the platform. Future products are catalog records.

### SP VAS Premium
- **Tier model:** subscription (monthly or annual)
- **Unlocks beyond the free tool:**
  - Unlimited scans (no 3-use cap)
  - Deeper scan coverage (exact expanded scope still open, §10.1)
  - Full branded PDF report with client organisation name on the letterhead
  - Scan history and comparison over time
  - API access for CI/CD pipelines and existing tooling
  - **SP VAS Desktop Agent** for scheduled, automated assessments without a browser session

### SP Fast Enterprise
- **Tier model:** subscription (monthly or annual), per-org, seat-limited by endpoint band
- **Positioning:** Network Performance Intelligence / Internet Performance Monitoring (IPM) platform, not a consumer speed test
- **Unlocks beyond the free Speed Test:**
  - Continuous monitoring
  - Multi-region measurement nodes (the core Enterprise differentiator)
  - Historical trend reporting
  - Alerting and threshold configuration
  - SLA verification and reporting
  - **SP Fast Enterprise Desktop Agent**, the persistent monitoring agent; each registered agent counts toward the licensed endpoint band
  - Team dashboard shared across the org
  - API access for exporting metrics

### 3.1 Desktop agent platform matrix (new in v2)

| Platform | Package | Service manager | SP VAS Agent | SP Fast Agent |
|---|---|---|---|---|
| Windows 10/11, Server 2019+ (x64) | `.msi` | Windows Service | Yes | Yes |
| Ubuntu / Debian (x64, arm64) | `.deb` | systemd | Yes | Yes |
| macOS 12+ (Apple Silicon + Intel, universal) | signed + notarised `.pkg` | launchd | Yes (proposed, §10.8) | Yes |
| RHEL / Rocky / Alma / Fedora (x64, arm64) | `.rpm` | systemd | Yes | Yes |
| Other Linux (x64, arm64) | `.tar.gz` static binary | manual / systemd unit supplied | Yes | Yes |
| Container (linux/amd64, linux/arm64) | OCI image | Docker / Kubernetes | Yes | Yes |

All agents are one Go codebase per product, cross-compiled. The agent never holds a user's password: it enrols with a short-lived **enrolment token** generated in the dashboard and thereafter authenticates with a per-device credential (§4.9).

---

## 4. Shared platform components (apply to ALL products)

### 4.1 Identity and authentication
- Email + password signup, bcrypt hashing, enforced minimum complexity
- Email verification; account inactive until confirmed
- JWT access token (15 min) + refresh token (30 days, rotated on use, httpOnly cookie, reuse detection revokes the whole token family)
- Password reset via time-limited, single-use token sent through Zoho Mail
- TOTP MFA (Google Authenticator / Authy compatible), optional per user, enforceable per org
- Session list and revoke from account settings
- Social login: not in Phase 3

### 4.2 Organisation model and RBAC
- One account belongs to at most one org
- Roles: **Org Owner**, **Billing Admin**, **IT Admin**, **Standard User**, **Read-only / Auditor** (capabilities as in v1; Org Owner is implicitly also IT Admin)
- A member can hold more than one role
- Capabilities are enforced as permission strings server-side, never inferred from role names in handlers

### 4.3 Product catalog
- Data-driven; each product is a database record
- Record holds: name, slug, description, feature list, plans, **one price per plan per currency** (NGN, USD), the matching Paystack plan code, version history, changelog
- **Per-version artifacts (changed in v2):** one artifact row per `(version, platform, arch, package format)`, with SHA-256 checksum and size. Platforms: `windows`, `macos`, `linux-deb`, `linux-rpm`, `linux-tar`, `container`.
- Adding a product = inserting a catalog record + provisioning its IaC template
- The marketing site's `/saas-products` hub reads its cards from `GET /v1/catalog` (fixes the hardcoded-cards gap)

### 4.4 Entitlements
- Link between an org/account, a product, a tier, seat/endpoint limit and expiry
- Enforced server-side before every download, API call and feature access
- Created by Paystack payment notifications (webhooks), or manually by a StackPrime admin for PO/invoice customers and support cases (a written reason is required)
- Expired or cancelled entitlements block access immediately

### 4.5 Licensed software downloads
- Authenticated, entitlement-checked endpoint, not static links
- Server returns a time-limited (5 min) pre-signed URL for a **private** Spaces bucket; the client downloads direct from object storage
- Every download logged: who, product, version, platform, when
- Published versions are immutable; checksums are shown to the user for verification

### 4.6 Billing
- **Paystack** for self-serve: monthly/annual subscriptions, one-time purchases, signed webhooks, and Paystack's hosted page for customers to update their card. Stripe is not available to Nigeria-registered businesses, so Paystack is the provider; the entitlement logic is provider-neutral, so a Stripe adapter can be added later (for example through a foreign entity) without changing it.
- Each plan has one price per currency. A subscription can be bought online only once its Paystack plan exists (created from the admin API). Changing an amount detaches the old Paystack plan so what is shown and what is charged never disagree.
- A purchase is recorded before the customer is sent to Paystack. On return the platform verifies it immediately; the webhook confirms it again. The amount and currency actually charged must match the recorded ones, otherwise the payment is flagged for a person and nothing is granted.
- Webhook handling is idempotent (Paystack gives no event id, so identical request bytes are treated as the same event), and an event that arrives before the payment it depends on is answered with an error so Paystack retries it.
- Subscription periods are paid-for time plus a 3-day grace period. Cancelling keeps access until the paid period ends. Paystack does not retry a failed subscription charge, so a failed renewal emails the customer and access lapses at the end of the grace period.
- PO/invoice path for Nigerian enterprises and government clients: org admin raises a PO request → StackPrime raises the invoice via Zoho Mail → on payment, a StackPrime admin activates the entitlement manually. Not automated in Phase 3, by design.

### 4.7 Audit and activity logging
- Every significant action logged (login, logout, MFA change, download, role change, entitlement change, billing event, API key and device events)
- Org-scoped for Org Owner and Auditor; global view in the StackPrime admin panel
- Append-only at the application layer, and at the database layer via a trigger that rejects `UPDATE` and `DELETE` on the audit table

### 4.8 API access
- Org-scoped, role-scoped, revocable keys; only a SHA-256 hash is stored, the plaintext is shown once
- Rate-limited per key

### 4.9 Device registry and agent authentication (new in v2)
- IT Admin generates a single-use **enrolment token** (expires in 24 h) in the dashboard
- The agent exchanges it for a **device credential**: a random secret stored hashed server-side, kept in the OS credential store on the endpoint
- Device row: `orgId`, `product`, `platform`, `arch`, `hostname`, `agentVersion`, `lastSeenAt`, `status`
- Active devices are counted against the entitlement's endpoint limit; enrolment is refused over the limit
- Heartbeat endpoint updates `lastSeenAt` and returns the current policy/config; a revoked device gets `401` on its next call and stops
- Revoking a device from the dashboard frees its seat

### 4.10 AI support agent: Raphael (new in v2)

Raphael is the first line of support inside the platform. A human is always one step away.

**What Raphael does**
- Chat widget on `app.stackprimeconsulting.com.ng` for signed-in users (a signed-out version for pre-sales questions is an open decision, §10.11)
- Answers from a curated knowledge base: product docs, install guides per platform, billing FAQs, agent troubleshooting, the PO/invoice process
- Read-only awareness of the signed-in user's own context (org, plan, entitlement status, registered devices and their last-seen time), so it can answer "why is my agent offline?" or "why can't I download?"
- Says clearly that it is an AI assistant

**What Raphael must never do**
- Change anything: no entitlement, billing, role, device or account changes. It can only point the user to the right screen.
- See or ask for passwords, MFA codes, API keys, device secrets or card numbers. If a user pastes one, it is redacted before storage and the user is told to rotate it.
- Give legal, security-assessment or refund commitments.

**Human hand-off**
- Triggers: the user asks for a person; Raphael cannot answer after two attempts; billing disputes, refunds, suspected account compromise, or any complaint
- Mechanism: the platform creates a support case with a reference (e.g. `SP-20260001`) and emails **support@stackprimeconsulting.com.ng** with the full transcript, user, org, product and plan, platform/agent version, and the reason for hand-off. The `Reply-To` is the customer, so the support team answers directly from their mailbox.
- The user sees the case reference and is told a human will reply by email. This is an **email hand-off, not a live-chat transfer**. Live human chat is not in Phase 3.
- Case status (open / replied / closed) is tracked in the platform so Raphael can answer "what happened to my request?"

**Data handling**
- Transcripts are stored against the account, with a retention period to be set (§10.11), and shown to the user on request
- Transcripts are covered by the platform privacy notice (Nigeria Data Protection Act 2023); the model provider must be listed there as a processor
- Raphael's chat endpoint is rate-limited per user and per IP; knowledge-base content and user messages are treated as untrusted input

---

## 5. Infrastructure

### 5.1 Architecture overview

```
app.stackprimeconsulting.com.ng
   └─ DigitalOcean droplet  s-1vcpu-1gb · Ubuntu 22.04 · Docker Compose · 2 GB swap
        ├─ Nginx (TLS, Let's Encrypt)  ─► Fastify API  (auth, orgs, catalog, entitlements,
        │                                  billing webhooks, downloads, agents, Raphael)
        │                              └─► React SPA   (static build, served by Nginx)
        ├─ PostgreSQL 16   (container, no published port, memory-capped, tuned)
        └─ Redis 7         (container, no published port, password, maxmemory cap)
   DO Spaces (private)  : stackprime-saas-artifacts  (licensed installers)
   DO Spaces (private)  : stackprime-saas-backups    (nightly pg_dump, 30-day expiry)
```

Postgres is a separate database from the SQLite files used by SP VAS and SP Fast Speed Test.

### 5.2 New infrastructure vs. Phases 1/2

| Resource | Phase 1/2 | Phase 3 addition |
|---|---|---|
| Droplet | Shared (marketing + SP VAS + SP Fast Speed Test) | **New dedicated droplet, `s-1vcpu-1gb`**, production only |
| Static IP | None | A **reserved IP**, created before the droplet so `app.` DNS can propagate first. Free while assigned to the droplet; about $5/month only while unassigned |
| Database | SQLite per app | Postgres in a container on the Phase 3 droplet |
| Cache | None | Redis in a container on the Phase 3 droplet |
| Object storage | None (the marketing site uses no bucket) | Optional, later: two **private** Spaces buckets (installers from step 5; nightly database dumps). Needs a new Spaces subscription |
| DNS | `vas.`, `speedtest.` / `tools.` | Add `app.` by hand at WhoGoHost (§5.5 item 3) |
| Registry | DO Container Registry, shared namespace | Same registry, same namespace, tag `app-prod-<sha>` |

### 5.3 Memory plan for the 1 GB droplet

| Component | Cap | Notes |
|---|---|---|
| PostgreSQL | 384 MB container limit; `shared_buffers` 128 MB, `max_connections` 30 | Tuned for a small dataset; Prisma pool is capped to match |
| Redis | `maxmemory` 128 MB, container limit 192 MB, `volatile-ttl` eviction, AOF on | Holds only rate-limit counters, login-lockout counters and one-time-code replay guards. Session revocation is checked in Postgres on every request, so it does not depend on Redis |
| API (Node) | 320 MB container limit, V8 heap capped at 192 MB | |
| Nginx | ~30 MB | |
| OS + Docker | ~150 MB | |
| **Swap** | **2 GB swapfile, `vm.swappiness=10`** | Overflow safety net, not working memory. The disk is only 25 GB, so 4 GB swap is possible but not the default. |

All caps are variables in `deploy/.env`. Moving to the 2 GB droplet means changing the droplet size and those values; no code change.

**Upgrade path:** set `droplet_size = "s-1vcpu-2gb"` in `terraform/sp-saas-platform/environments/production.tfvars`, apply, then raise the caps in `deploy/.env`. A resize powers the droplet off briefly. The Terraform default keeps the disk at 25 GB so the resize stays reversible; growing the disk is permanent.

**Watch signals** (DO Monitoring alerts): memory above 85% for 10 minutes, swap in use above 50%, disk above 80%. Any of these means upgrade.

### 5.4 Estimated monthly cost (Phase 3 additions only)

| Resource | Cost |
|---|---|
| Phase 3 droplet (`s-1vcpu-1gb`) | ~$6 |
| Weekly droplet backups (20% of the droplet) | +~$1.20: the database safety net until a backups bucket exists |
| Spaces subscription, **only when buckets are created** | $5/month (250 GiB storage and 1 TiB transfer, shared by all buckets). Phase 1 used no bucket, so this is a new cost |
| **Phase 3 addition at launch** | **~$7.20** (about $12.20 once Spaces is added) |

Combined with the existing ~$6 production droplet, droplet spend is ~$12/month before backups. The earlier ~$50 estimate (managed Postgres, Redis droplet, staging droplet) is withdrawn.

### 5.5 Alignment with the marketing-site infra docs (new in v2)

1. **Web Solutions subdomain.** `INFRASTRUCTURE.md` reserves `tools.stackprimeconsulting.com.ng` for Phase 2, while the v1 scope refers to `vas.` and `speedtest.`. Decision needed on which the CTAs and the catalog's `launchUrl` should use.
2. **Where installers are served from.** `INFRASTRUCTURE.md` says the `cdn.` Spaces bucket will serve downloadable installers. That bucket is public. Licensed installers must **not** live there. They go in the private Phase 3 bucket and are served only by pre-signed URL. `cdn.` stays for public assets.
3. **Where DNS lives.** A lookup on 8 November 2026 showed the domain's nameservers are `nsa.whogohost.com` and `nsb.whogohost.com`, so DNS is hosted at WhoGoHost, not DigitalOcean, and Terraform cannot manage it. No `app.` record existed. The Phase 3 Terraform creates a **reserved IP** first; the `app.` A record is added by hand in the WhoGoHost DNS zone, pointing at that IP. Do not move the nameservers to DigitalOcean just for this: the zone also holds the marketing site and the Zoho mail records (MX, SPF, DKIM), and every one would have to be recreated first.
4. **Shared API gateway.** `api.stackprimeconsulting.com.ng` is reserved "if needed once Phase 3 lands". Phase 3 starts without it. The API is served at `app.stackprimeconsulting.com.ng/v1/*`. Agents and API-key users call that path, so an `api.` alias can be added later without changing the code.

### 5.6 No staging environment

Phase 3 has a production environment only. Because this system handles logins, billing and licensed downloads, the following replace staging:

- A local Docker Compose environment used for every change
- Paystack **test mode** keys everywhere except production. Webhooks cannot reach a local machine, so locally the customer's return (`GET /v1/billing/verify`) completes the purchase and the tests post signed sample webhooks
- Every Prisma migration is first applied to a database restored from last night's backup, before it runs in production
- Image tags are git SHAs; rollback is re-deploying the previous tag
- If revenue or customer count justifies it later, a staging droplet is added as a second `.tfvars` file; the Terraform is already environment-parameterised

### 5.7 Terraform structure (separate state, same pattern)

```
terraform/
  sp-saas-platform/
    main.tf                 # reserved IP, droplet, firewall, alerts; optional Spaces buckets and DNS record
    variables.tf
    outputs.tf
    providers.tf
    backend.tf.remote.example   # OPTIONAL remote state; by default state is local, so no bucket is needed
    cloud-init.yaml.tftpl   # swap, kernel settings, Docker, deploy user
    environments/
      production.tfvars
```

Own state, separate from the marketing site. State is local by default (back up `terraform.tfstate` and never commit it); it can move to a Spaces bucket later with `terraform init -migrate-state`. The manual GitHub workflow works only once remote state is set up. The Phase 3 Terraform is self-contained and does not reuse the Phase 1 `droplet/` and `dns/` modules, because those were not readable when this was written; it can be refactored onto them later.

---

## 6. Tech stack

| Layer | Technology |
|---|---|
| API | Fastify + TypeScript |
| ORM | Prisma (Postgres) |
| Auth | JWT (access + refresh), bcrypt, TOTP (`otpauth`) |
| Billing | Paystack (REST API + signed webhooks), provider-neutral entitlement logic |
| Email | Zoho Mail (SMTP, transactional) |
| Frontend | React + TypeScript + Vite (separate from the Next.js marketing site) |
| Support agent (Raphael) | LLM API (provider to confirm; Claude API proposed) + knowledge base in Postgres; escalation by Zoho Mail to support@ |
| Download storage | DigitalOcean Spaces (S3-compatible, private, pre-signed URLs) |
| Desktop agents | Go, cross-compiled for Windows, macOS, Linux (x64 + arm64) |
| Packaging | WiX (`.msi`), `pkgbuild` + notarisation (`.pkg`), `nfpm` (`.deb`/`.rpm`), Docker buildx |
| CI/CD | GitHub Actions, DO Container Registry, SSH deploy (same as marketing site) |

---

## 7. Build sequencing

1. **Identity layer**: signup, verification, login, JWT, refresh rotation, password reset, MFA, sessions
2. **Org model + RBAC**: organisation, invites, roles
3. **Product catalog**: schema, admin seeding of SP VAS Premium and SP Fast Enterprise
4. **Billing + entitlements**: Paystack, webhooks, enforcement, manual PO/invoice activation
5. **Licensed downloads**: entitlement check, pre-signed URL, download log
6. **Device registry + agent API**: enrolment, heartbeat, revoke *(moved up: agents cannot be built without it)*
7. **Platform frontend**: React SPA
8. **Desktop agents**: SP VAS (Windows, Debian/Ubuntu, macOS, RPM, tar, container), SP Fast Enterprise (same set)
9. **API keys**
10. **Marketing-site integration**: `/saas-products` reads `GET /v1/catalog`
11. **Support agent (Raphael)**: knowledge base, chat endpoint, support cases, hand-off to support@

Each step is tested end-to-end before the next begins.

---

## 8. Agent distribution and trust

- Windows: Authenticode-signed `.msi` (needs a code-signing certificate)
- macOS: Developer ID signed and notarised `.pkg` (needs an Apple Developer Program membership)
- Linux: `.deb`/`.rpm` signed with a StackPrime GPG key; `.tar.gz` ships with a `SHA256SUMS` file
- Container: image signed with cosign
- Agents self-report version on every heartbeat; the platform can mark a version as *minimum supported* so old agents are told to update

---

## 9. Security requirements

- Passwords: bcrypt cost ≥ 12; breached-password check is a later enhancement
- Refresh-token reuse revokes the entire token family
- All secrets live in GitHub Actions secrets and the droplet `.env`; none in git
- Paystack webhook signatures (HMAC-SHA512) verified on the raw request body, with constant-time comparison
- Rate limits on login, signup, password reset and verification-resend
- Postgres and Redis run in containers on an internal Docker network with no published ports; Redis is password-protected
- Nightly `pg_dump` to a private Spaces bucket with 30-day expiry; restore is tested before the first production launch
- Audit table protected by a database-level immutability trigger

---

## 10. Open decisions to confirm before production launch

1. **SP VAS Premium scan scope.** Options: authenticated scanning, more port coverage, banner grabbing + CVE lookup, subdomain enumeration. Each has different legal/abuse risk. The Desktop Agent should only scan targets the org has proven it owns.
2. **SP Fast Enterprise endpoint bands.** The scaffold counts **registered active agents**; confirm this is the billing unit.
3. **Perpetual vs. subscription.** Scaffold supports both; both products are seeded as subscription.
4. **Annual discount rate.**
5. **Pricing.** Not defined, per currency (NGN and USD). Subscriptions cannot be sold online until prices are set and their Paystack plans created.
6. **PO/invoice threshold.** Open to any org, or above a minimum contract value?
7. **Bundle.** Can SP VAS Premium and SP Fast Enterprise be bought together at a discount?
8. **macOS for the SP VAS agent.** v2 proposes yes; confirm.
9. **Web Solutions subdomain** (`tools.` vs `vas.`/`speedtest.`), see §5.5.
10. **Code-signing.** Windows certificate and Apple Developer membership must be purchased before agents can be distributed to customers.
11. **Raphael.** LLM provider; whether signed-out visitors can use it; transcript retention period; who owns and updates the knowledge base.
12. **Paystack account.** Confirm with Paystack: USD acceptance and settlement currency for StackPrime's account, subscription and card limits, and the fees. These depend on account approval, not on code.

---

## 11. Phase 4 addendum: Mobile Companion (Android and iOS)

### 11.1 Phase numbering
`INFRASTRUCTURE.md` in the repo defines **Phase 4 as the Training Academy Portal** (`learn.` subdomain). Mobile is now also requested for Phase 4. Proposed resolution, pending Timothy's confirmation:

- **Phase 4A: Training Academy Portal** (as already documented)
- **Phase 4B: Mobile Companion** (this addendum)

Alternatively, mobile becomes Phase 5. The repo's `INFRASTRUCTURE.md` would then not need to change.

### 11.2 Scope
Mobile is a **companion**, not a port of the desktop agents.

| Capability | Android | iOS |
|---|---|---|
| Sign in (same account, same MFA) | Yes | Yes |
| View SP Fast dashboards, alerts, SLA reports | Yes | Yes |
| View SP VAS scan history and reports | Yes | Yes |
| Push notifications for SP Fast alerts | Yes (FCM) | Yes (APNs) |
| On-demand speed test from the phone | Yes | Yes |
| Continuous background monitoring | Limited by OS battery rules | Strongly limited by OS |
| Scheduled vulnerability scanning | No | No |

### 11.3 Billing rule
Mobile apps are **sign-in clients only**. Purchases happen on the web via Paystack. The apps do not sell subscriptions or link to the checkout page from inside the app, which keeps the apps clear of Apple/Google in-app-purchase rules. Both store policies must be re-checked before submission.

### 11.4 Platform additions required
- Push-token registration endpoint and table
- Device registry extended with `android` and `ios` platform values (already reserved in the Prisma enum, not exposed in Phase 3)
- Store accounts: Google Play Console, Apple Developer Program
- Tech choice: to be decided (Kotlin + Swift native, or one cross-platform codebase)

### 11.5 Not included
Mobile agents that run scheduled scans, mobile purchase flows, tablets/wearables-specific UIs.

---

## 12. Repo conventions that apply to Phase 3 work

From the repo's `CLAUDE.md` ("Strict compliance is expected"):

- **Do not edit or modify existing files** in the project folder. Phase 3 is delivered as **new files only**: `sp-saas-platform/`, `terraform/sp-saas-platform/`, `.github/workflows/sp-saas-*.yml`, and this scope document.
- Only files that must change are changed. The marketing-site integration (step 10) will need to edit the `/saas-products` page and `lib/site-data.ts`, and will be listed explicitly and approved before it is touched.
- Staging shares the DO Container Registry namespace (tags distinguish environments).
- Zoho is the provider for transactional email, consistent with the marketing site.
- Secrets are never committed; `.env.example` documents every variable.

---

## 13. What Phase 3 does NOT include

- Social login
- Reseller / white-label tiers
- **Native mobile apps (now Phase 4 addendum, §11)**
- Automated dunning beyond Paystack's defaults and one failure email
- Live human chat or a full ticketing system. Support is Raphael (§4.10), with human hand-off by email to support@stackprimeconsulting.com.ng
