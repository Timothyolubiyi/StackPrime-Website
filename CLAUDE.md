# StackPrime Consulting Ltd — Website Deployment & Infrastructure Architecture

**RC 9676973**
**Scope of this document:** the Public Marketing Site (Phase 1) and the shared foundation (DNS, domains, environments, CI/CD pattern) that Phases 2–4 will build on. Infra for Web Solutions, SaaS Platform, and Training Academy ships in later phases, but the domain/subdomain and environment structure below is designed now so those phases plug in without reworking DNS or the deployment pattern.

---

## 1. Guiding Principles

- **Consistency with existing infra.** SP Fast Phase 1 already uses a Fastify/TypeScript/Prisma backend on Docker, DigitalOcean Terraform, and GitHub Actions. The marketing site follows the same provider (DigitalOcean), the same IaC tool (Terraform), and the same deployment mechanism (Docker container + GitHub Actions), so the team isn't maintaining two different operational patterns.
- **One domain, many subdomains, independently deployed.** Each of the four surfaces (Marketing Site, Web Solutions, SaaS Platform, Training Academy) is a separate deployable unit on its own subdomain, provisioned by its own Terraform module — a redeploy or outage on one never touches another.
- **Environments before scale.** Two environments from day one — `production` and `staging` — even though StackPrime is early-stage. Shipping a services page edit or nav change straight to production with no preview step is how avoidable mistakes go live.
- **Infra as code, no manual console changes.** Every DigitalOcean resource (droplet, firewall, DNS record, Spaces bucket) is created via Terraform. Manual changes in the DO dashboard cause state drift and are avoided.
- **Secrets never in git.** `.env` files are local-only and template-only in the repo (`.env.example`). Production secrets live in GitHub Actions encrypted secrets and are injected at deploy time.

---

## 2. Domain & Subdomain Architecture

| Subdomain | Surface | Phase | Status |
|---|---|---|---|
| `stackprimeconsulting.com.ng` / `www.` | Public Marketing Site | Phase 1 | **This document** |
| `tools.stackprimeconsulting.com.ng` | Web Solutions runtime (speedtest, VAPT scan, file scan) | Phase 2 | Reserved, not yet provisioned |
| `app.stackprimeconsulting.com.ng` | SaaS Platform (org admin, catalog, entitlements, downloads) | Phase 3 | Reserved, not yet provisioned |
| `learn.stackprimeconsulting.com.ng` | Training Academy Portal | Phase 4 | Reserved, not yet provisioned |
| `api.stackprimeconsulting.com.ng` | Shared/internal API gateway (if needed once Phase 3 lands) | Phase 3+ | Reserved, not yet provisioned |
| `cdn.stackprimeconsulting.com.ng` | DigitalOcean Spaces (static assets, images, downloadable installers) | Phase 1 (provisioned now) | **This document** |

Reserving the subdomain names now (even before building what lives on them) means Phase 1's DNS module doesn't need to change shape later — later phases add new records, they don't restructure existing ones.

---

## 3. Environments

| Environment | Purpose | Droplet | Domain |
|---|---|---|---|
| `production` | Live public site | `stackprime-marketing-prod` | `stackprimeconsulting.com.ng` |
| `staging` | Pre-release review, client/partner previews | `stackprime-marketing-staging` | `staging.stackprimeconsulting.com.ng` |

Both environments are provisioned by the same Terraform module with different `.tfvars` files — no duplicated code, just different input variables (droplet size, domain, environment tag).

---

## 4. Hosting & Runtime Architecture

```
                         ┌─────────────────────────────┐
                         │   DigitalOcean DNS (domain)  │
                         │  stackprimeconsulting.com.ng    │
                         └──────────────┬───────────────┘
                                        │  A record
                                        ▼
                         ┌─────────────────────────────┐
                         │   DigitalOcean Droplet        │
                         │   Ubuntu 22.04 · Docker        │
                         │  ┌───────────────────────┐    │
                         │  │  Nginx (reverse proxy) │    │
                         │  │  + Let's Encrypt TLS   │    │
                         │  └──────────┬────────────┘    │
                         │             │                  │
                         │  ┌──────────▼────────────┐    │
                         │  │  Next.js container     │    │
                         │  │  (marketing site)      │    │
                         │  └────────────────────────┘    │
                         └─────────────────────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │  DigitalOcean Spaces (CDN)    │
                         │  images, static assets,       │
                         │  publications media            │
                         └─────────────────────────────┘
```

- **Compute:** a single DigitalOcean Droplet per environment runs Docker + Docker Compose. The Next.js app runs in its own container; Nginx runs in a sibling container as reverse proxy and TLS terminator (Certbot for Let's Encrypt, auto-renewed via cron inside the Nginx container).
- **Why a Droplet and not a managed PaaS (e.g. DO App Platform):** matches the SP Fast pattern already in use, keeps a single operational model across all StackPrime infra, and avoids paying for two different hosting abstractions while the company is still small. This is a deliberate tradeoff — App Platform would mean less server management — worth revisiting once there's a dedicated DevOps hire.
- **Static assets & downloads:** DigitalOcean Spaces (S3-compatible object storage + built-in CDN) serves images, Publications media, and — once Phase 3 lands — the versioned Software/Apps download artifacts. Provisioned now so the Publications and image-heavy pages of the marketing site have a CDN from day one.
- **Firewall:** DigitalOcean Cloud Firewall allows only 22 (SSH, restricted to deploy IP/GitHub Actions runners where possible), 80, and 443.

---

## 5. CI/CD Pipeline

```
git push → GitHub Actions
   ├─ Lint & build check (every PR)
   ├─ On merge to `develop` → build image → push to DO Container Registry
   │      → SSH deploy to staging droplet → docker compose pull && up -d
   └─ On merge to `main` → build image → push to DO Container Registry
          → SSH deploy to production droplet → docker compose pull && up -d
```

- **Registry:** DigitalOcean Container Registry (keeps image storage and compute in the same provider/account, simpler billing and access control than an external registry).
- **Deploy mechanism:** GitHub Actions connects over SSH (key stored as an encrypted GitHub secret) and runs `docker compose pull && docker compose up -d` on the target droplet. Simple, auditable in the Actions log, no extra orchestration layer needed at this scale.
- **Rollback:** each image is tagged with the git SHA; rolling back is re-pointing `docker-compose.yml`'s image tag to the previous SHA and re-running the deploy step manually via `workflow_dispatch`.
- **Terraform changes:** infra changes (new droplet, DNS record, Spaces bucket) go through a separate `terraform-plan.yml` workflow that runs `terraform plan` on every PR touching `terraform/` and posts the plan as a PR comment; `terraform apply` is a manual `workflow_dispatch` step, never automatic — infra changes should always get a human look before applying.

---

## 6. Terraform Structure

```
terraform/
  modules/
    droplet/        # reusable droplet + firewall + docker bootstrap module
    dns/             # reusable DNS record module
  environments/
    production.tfvars
    staging.tfvars
  main.tf            # root module: wires droplet + dns + spaces per environment
  variables.tf
  outputs.tf
  providers.tf
  backend.tf         # remote state in DO Spaces
```

State is stored remotely in a dedicated DigitalOcean Spaces bucket (`stackprime-terraform-state`) rather than locally, so state isn't lost if a laptop dies and so it's consistent if more than one person ever runs Terraform.

---

## 7. Secrets & Configuration

| Secret | Where it lives | Used by |
|---|---|---|
| `DIGITALOCEAN_TOKEN` | GitHub Actions secret | Terraform, DO CLI (`doctl`) |
| `DO_REGISTRY_TOKEN` | GitHub Actions secret | Docker image push |
| `SSH_PRIVATE_KEY` (deploy key) | GitHub Actions secret | SSH deploy step |
| `DO_SPACES_KEY` / `DO_SPACES_SECRET` | GitHub Actions secret + droplet `.env` | Terraform backend, app asset uploads |
| Contact form / newsletter provider API key | GitHub Actions secret + droplet `.env` | Next.js server-side form handling |

No secret is ever committed. `.env.example` in this repo documents every variable name the app needs, with placeholder values only.

---

## 8. Monitoring & Backups

- **Uptime:** DigitalOcean Monitoring (free tier) enabled on both droplets — CPU, memory, disk alerts to the StackPrime email.
- **Backups:** DigitalOcean Droplet backups enabled (weekly snapshot) on the production droplet.
- **Logs:** container logs via `docker compose logs`, shipped nowhere external yet — acceptable at current scale; revisit (e.g. centralized logging) once Phase 3's SaaS Platform introduces audit-logging requirements anyway.

---

## 9. Cost Estimate (Phase 1 only, monthly, approximate)

| Resource | Est. cost |
|---|---|
| Droplet — production (s-2vcpu-2gb) | ~$18 |
| Droplet — staging (s-1vcpu-1gb) | ~$6 |
| DigitalOcean Spaces (250GB + CDN) | ~$5 |
| DigitalOcean Container Registry (starter) | ~$5 |
| Domain (already owned) | $0 |
| **Total** | **~$34/month** |

Scales up when Phases 2–4 add their own droplets/managed databases; each phase's infra doc should carry its own cost line so the total stays visible.

---

## 10. What's Provisioned by This Repo Right Now

- [x] Production + staging droplets (Terraform)
- [x] Firewall rules
- [x] DNS records for the marketing site + reserved subdomains for future phases
- [x] DigitalOcean Spaces bucket (assets/CDN) + Terraform remote state bucket
- [x] Dockerfile for the Next.js marketing site
- [x] docker-compose for app + Nginx + Certbot
- [x] GitHub Actions: PR checks, staging deploy, production deploy, Terraform plan
- [ ] Web Solutions runtime infra — Phase 2
- [ ] SaaS Platform infra (this will likely need a managed Postgres database, not just a droplet) — Phase 3
- [ ] Training Academy Portal infra — Phase 4

---

## 11. Open Decisions

- Whether `staging` gets its own DO Container Registry namespace or shares production's with different tags (currently: shares, tagged `staging-<sha>` vs `prod-<sha>`).
- Contact form / newsletter provider not yet chosen (affects one secret and one API integration in the Next.js app) — placeholder in `.env.example`.
- Whether to move from Droplet to DO App Platform once a dedicated DevOps resource exists — noted as a deliberate tradeoff in Section 4, not a current action item.


## Markdown
Note: Strict complaince is expected
Do not edit or modified existing files in this project folder. 
Only Files for modification should be modified. 

1. staging should share DO Container Registry namespace 
2. Contact form / newsletter provider - Zoho will be used for deployment with the important capabilities below;
- Contact Us form with spam protection.
- Newsletter subscription.
- Automatic email notifications to info@stackprimeconsulting.com.ng

Contact form and Newletter form Architecture

               STACKPRIME WEBSITE
                         │
             ┌───────────┴───────────┐
             │                       │
       CONTACT FORM            NEWSLETTER FORM
             │                       │
             ▼                       ▼
       Zoho Forms              Zoho Campaigns
             │                       │
             │                       ▼
             │                Subscriber List
             │                       │
             ▼                       ▼
     Email notification          Newsletter
             │
             ▼
    info@stackprimeconsulting.com.ng

