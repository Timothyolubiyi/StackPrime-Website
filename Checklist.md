# StackPrime Website - Deployment & Completion Checklist

**Project Status:** Phase 1 (Public Marketing Site) — 85% development complete, infrastructure staging phase  
**Current Date:** 2026-09-14  
**Domain Status:** ⚠️ Not yet purchased

---

## Phase 1: Pre-Deployment Setup (Infrastructure & Secrets)

### Domain Registration
- [ ] **Purchase domain `stackprimeconsulting.com.ng`**
  - Register via preferred domain registrar with WhoGoHost (GoDaddy, Namecheap, etc.)
  - Ensure DNS can be managed (will point to DigitalOcean nameservers)
  - Keep domain credentials/account access secure
  - Expected cost: ~$10-15/year

### DigitalOcean Account & API Setup
- [ ] **Create DigitalOcean account** (https://digitalocean.com)
  - Sign up and verify email
  - Add billing method
- [ ] **Generate DigitalOcean API token**
  - Account → Settings → API → Tokens/Keys → Generate New Token
  - Store securely (will use as `DIGITALOCEAN_TOKEN` GitHub Actions secret)
- [ ] **Configure DigitalOcean project**
  - Create a project named "StackPrime" (optional, for organization)
  - Default project is fine if preferred

### SSH Key for Deployment
- [ ] **Generate SSH keypair locally** (if not already done)
  ```bash
  ssh-keygen -t ed25519 -f deploy_key -C "stackprime-deploy"
  ```
  - `deploy_key` = private key (add to GitHub secret)
  - `deploy_key.pub` = public key (add to Terraform)
- [ ] **Store private key securely** — never commit to git

### GitHub Actions Secrets Configuration
Set these in repository Settings → Secrets and Variables → Actions:

**Infrastructure & Deployment:**
- [ ] `DIGITALOCEAN_TOKEN` — DigitalOcean API token (from step above)
- [ ] `DEPLOY_SSH_PRIVATE_KEY` — private SSH key for droplet access
- [ ] `PRODUCTION_DROPLET_IP` — populate after first `terraform apply` (see Step 2 below)

**DigitalOcean Spaces (Static Assets & Terraform State):**
- [ ] `DO_SPACES_KEY` — DigitalOcean Spaces API key
- [ ] `DO_SPACES_SECRET` — DigitalOcean Spaces API secret
  - Generate at Account → Settings → API → Spaces Keys

**Zoho CRM & Forms (Contact Form & Newsletter)**
- [ ] `ZOHO_CLIENT_ID` — OAuth client ID
- [ ] `ZOHO_CLIENT_SECRET` — OAuth client secret
- [ ] `ZOHO_REFRESH_TOKEN` — long-lived refresh token (from OAuth flow)
- [ ] `ZOHO_CAMPAIGNS_LIST_KEY` — target list ID in Zoho Campaigns
  - ⚠️ **These are runtime-only secrets** — NOT stored as GitHub Actions secrets
  - Instead, manually add them to each droplet's `/opt/stackprime-marketing-site/.env` after deployment

**Google reCAPTCHA v3:**
- [ ] `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` — public site key (baked into build, safe to expose)
  - Also set in GitHub Actions secret so deploy workflow can inject it
- [ ] `RECAPTCHA_SECRET_KEY` — secret key for server-side verification
  - Runtime-only secret — manually add to droplet `.env` (not a GitHub Actions secret)

---

## Phase 2: Terraform Infrastructure Provisioning

### Terraform Files & Configuration
- [ ] **Create `terraform/environments/staging.tfvars`**
  - Copy from `production.tfvars` and adjust:
    ```hcl
    region              = "nyc3"
    droplet_size        = "s-1vcpu-1gb"  # smaller for staging
    domain_name         = "stackprimeconsulting.com.ng"
    enable_backups      = false
    reserved_subdomains = ["tools", "app", "learn", "api"]
    ssh_public_key      = "ssh-ed25519 ..."  # from Step 1
    admin_ssh_ip_allowlist = ["0.0.0.0/0"]   # TODO: tighten to your IP
    ```

- [ ] **Update `terraform/environments/production.tfvars`**
  - Set `ssh_public_key` to your generated public key
  - Set `admin_ssh_ip_allowlist` to your actual admin/CI IP (tighten from `0.0.0.0/0`)
  - Set `enable_backups = true` for production

- [ ] **Initialize Terraform remote state**
  ```bash
  cd terraform
  terraform init \
    -backend-config="access_key=$DO_SPACES_KEY" \
    -backend-config="secret_key=$DO_SPACES_SECRET"
  ```

### Provision Droplets
- [ ] **Terraform Apply for Staging**
  - Run "Terraform Apply (manual)" GitHub Actions workflow, selecting `staging`
  - Or locally: `terraform apply -var-file=environments/staging.tfvars`
  - Retrieve `droplet_ip` output → set as `STAGING_DROPLET_IP` GitHub secret

- [ ] **Terraform Apply for Production**
  - Run "Terraform Apply (manual)" GitHub Actions workflow, selecting `production`
  - Or locally: `terraform apply -var-file=environments/production.tfvars`
  - Retrieve `droplet_ip` output → set as `PRODUCTION_DROPLET_IP` GitHub secret

- [ ] **Verify droplets are running**
  - Log in to DigitalOcean dashboard → Droplets
  - Both should show as "Active"

---

## Phase 3: DNS & Domain Setup

- [ ] **Add domain to DigitalOcean DNS**
  - DigitalOcean → Networking → Domains → Add Domain
  - Enter `stackprimeconsulting.com.ng`
  - DigitalOcean generates nameservers (e.g., `ns1.digitalocean.com`, etc.)

- [ ] **Update registrar nameservers**
  - Go to domain registrar's DNS settings
  - Replace all existing nameservers with DigitalOcean's nameservers
  - Wait 24-48 hours for propagation (can check with `dig`)

- [ ] **Verify DNS records created**
  - Terraform's DNS module should have created:
    - `stackprimeconsulting.com.ng` A record → production droplet IP
    - `www.stackprimeconsulting.com.ng` A record → production droplet IP
    - `staging.stackprimeconsulting.com.ng` A record → staging droplet IP
    - Reserved subdomains for future phases (tools, app, learn, api)
  - Check: `dig stackprimeconsulting.com.ng` → should resolve within a few minutes

---

## Phase 4: TLS & HTTPS Setup

- [ ] **Issue first Let's Encrypt certificate (on production droplet)**
  ```bash
  ssh deploy@<PRODUCTION_DROPLET_IP>
  cd /opt/stackprime-marketing-site
  ./scripts/init-tls.sh stackprimeconsulting.com.ng info@stackprimeconsulting.com.ng
  docker compose exec nginx nginx -s reload
  ```
  - Creates certificate in `nginx/certbot/conf/`
  - Nginx will serve HTTPS traffic

- [ ] **Verify HTTPS works**
  - `curl https://stackprimeconsulting.com.ng/api/health` → should return HTTP 200
  - Open in browser → no SSL warnings

- [ ] **Issue certificate for staging (optional but recommended)**
  ```bash
  ssh deploy@<STAGING_DROPLET_IP>
  cd /opt/stackprime-marketing-site
  ./scripts/init-tls.sh staging.stackprimeconsulting.com.ng info@stackprimeconsulting.com.ng
  docker compose exec nginx nginx -s reload
  ```

---

## Phase 5: Backend Integrations

### Zoho CRM Setup (Contact Form)
- [ ] **Create Zoho CRM account** (https://www.zoho.com/crm/)
  - Set up organization
  - Create custom module/form to capture leads from "Contact Us"

- [ ] **Set up Zoho Forms** (or use Zoho CRM's lead form)
  - Create form with fields: Name, Email, Company, Message
  - Enable form submission notifications to `info@stackprimeconsulting.com.ng`

- [ ] **Generate Zoho OAuth credentials**
  - Register custom app in Zoho CRM (Settings → Developer Connections → Connected Apps)
  - Obtain `Client ID`, `Client Secret`
  - Generate `Refresh Token` via OAuth 2.0 flow
  - Store these in GitHub Actions secrets (marked as runtime-only)

- [ ] **Implement Contact Form API route** (`app/api/contact/route.ts`)
  - [ ] Verify reCAPTCHA token server-side
  - [ ] Call Zoho CRM/Forms API to create lead
  - [ ] Trigger email notification to `info@stackprimeconsulting.com.ng`
  - [ ] Handle errors gracefully (return 400 on bad input, 500 on API failure)

### Zoho Campaigns Setup (Newsletter)
- [ ] **Create Zoho Campaigns account** (https://campaigns.zoho.com/)
  - Set up email campaign list named "StackPrime Newsletter"
  - Note the list ID → use as `ZOHO_CAMPAIGNS_LIST_KEY`

- [ ] **Implement Newsletter API route** (`app/api/newsletter/route.ts` — new file)
  - [ ] Validate email format
  - [ ] Call Zoho Campaigns API to add subscriber
  - [ ] Return 200 on success, 400 on bad input, 500 on API error

- [ ] **Wire up Newsletter component** (`components/Newsletter.tsx`)
  - [ ] Replace placeholder `handleSubmit` with API call to `/api/newsletter`
  - [ ] Show success/error feedback to user

### Google reCAPTCHA v3 Setup
- [ ] **Register site at Google reCAPTCHA Admin Console** (https://www.google.com/recaptcha/admin)
  - Create new key for `stackprimeconsulting.com.ng` (reCAPTCHA v3)
  - Obtain `Site Key` (public) → set as `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
  - Obtain `Secret Key` → set as `RECAPTCHA_SECRET_KEY`

- [ ] **Wire up Contact Form component** (`components/ContactForm.tsx`)
  - [ ] Load reCAPTCHA v3 script
  - [ ] Call `grecaptcha.execute()` on form submit
  - [ ] Send token to `/api/contact` endpoint

- [ ] **Implement reCAPTCHA verification** (in `app/api/contact/route.ts`)
  - [ ] POST to `https://www.google.com/recaptcha/api/siteverify`
  - [ ] Verify score > 0.5 (threshold for human)
  - [ ] Reject if score is low

---

## Phase 6: GitHub & CI/CD Configuration

### GitHub Actions Setup
- [ ] **Configure GitHub production environment**
  - Repository → Settings → Environments → New Environment → "production"
  - Add required reviewers (Team Lead or equivalent) for approval gate
  - This gates deployments to production (PRs to `main` require approval before deploy)

- [ ] **Verify GitHub Actions workflows**
  - [ ] `ci.yml` — runs on all PRs, lints & builds
  - [ ] `deploy-production.yml` — auto-runs on merge to `main` (requires production env approval)
  - [ ] `terraform-plan.yml` — comments plan on PRs touching `terraform/`
  - [ ] `terraform-apply.yml` — manual workflow to apply Terraform changes

### Test CI/CD Pipeline
- [ ] **Create a test PR to main**
  - CI workflow should run (lint, type-check, build)
  - Merge → production deploy should trigger
  - Approve in GitHub environment → deploys should run
  - Verify health check passes: `https://stackprimeconsulting.com.ng/api/health` → 200 OK

---

## Phase 7: Content & Asset Fixes

- [ ] **Fix `networking-1.jpg` image**
  - Current state: `networking-1.jpg` is a duplicate of `networking-2.jpg`
  - Supply the correct original image
  - Replace `public/images/networking-1.jpg`
  - Verify `/services/networking-it-infrastructure` page loads correct image

- [ ] **Populate Publications page** (optional for launch, can be "Coming Soon")
  - Decision: Keep empty state (current) or add placeholder articles?
  - If articles: add to `app/company/publications/page.tsx`

- [ ] **DigitalOcean Spaces setup** (for future CDN use)
  - [ ] Create Spaces bucket named `stackprime-assets-production`
  - [ ] Create Spaces bucket for Terraform state: `stackprime-terraform-state`
  - [ ] Upload images to Spaces (optional — can use local `public/` for now)
  - [ ] Update `.env` on droplet: `DO_SPACES_BUCKET=stackprime-assets-production`

---

## Phase 8: Environment Variables on Droplet

After first deployment, manually set runtime-only secrets on each droplet:

### Staging Droplet
```bash
ssh deploy@<STAGING_DROPLET_IP>
cd /opt/stackprime-marketing-site

# Create/edit .env file
cat > .env <<'EOF'
NEXT_PUBLIC_SITE_URL=https://staging.stackprimeconsulting.com.ng
NEXT_PUBLIC_ASSETS_CDN_URL=https://cdn.stackprimeconsulting.com.ng
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<reCAPTCHA site key>

ZOHO_CLIENT_ID=<Zoho client ID>
ZOHO_CLIENT_SECRET=<Zoho client secret>
ZOHO_REFRESH_TOKEN=<Zoho refresh token>
ZOHO_ACCOUNTS_DOMAIN=https://accounts.zoho.com
ZOHO_CRM_API_DOMAIN=https://www.zohoapis.com
ZOHO_CAMPAIGNS_LIST_KEY=<Zoho campaigns list ID>
ZOHO_NOTIFICATION_EMAIL=info@stackprimeconsulting.com.ng

RECAPTCHA_SECRET_KEY=<reCAPTCHA secret key>

DO_SPACES_KEY=<DO Spaces key>
DO_SPACES_SECRET=<DO Spaces secret>
DO_SPACES_BUCKET=stackprime-assets-staging
DO_SPACES_REGION=nyc3

REGISTRY_IMAGE=<will be set by deploy workflow>
EOF

chmod 600 .env
docker compose up -d
```

### Production Droplet
```bash
ssh deploy@<PRODUCTION_DROPLET_IP>
cd /opt/stackprime-marketing-site

# Same .env setup as staging, but:
# - NEXT_PUBLIC_SITE_URL=https://stackprimeconsulting.com.ng
# - NEXT_PUBLIC_ASSETS_CDN_URL=https://cdn.stackprimeconsulting.com.ng
# - DO_SPACES_BUCKET=stackprime-assets-production
```

---

## Phase 9: Pre-Launch Testing

### Functional Testing
- [ ] **Home page loads** — `https://stackprimeconsulting.com.ng` (or staging URL)
- [ ] **All 17 routes accessible** — no 404s:
  - Home, Services overview, 5 service pages, VAPT deep page
  - Training Academy, SaaS Products, Web Solutions
  - Company (About, Careers, Publications, Contact)
  - Get Started, `/api/health`

- [ ] **Navigation works**
  - Mega-menu Services dropdown opens correctly
  - Company dropdown accessible
  - All links point to correct URLs

- [ ] **Contact form submits successfully**
  - Fill form with test data
  - reCAPTCHA widget loads
  - Submission goes to `/api/contact`
  - Verify email arrives at `info@stackprimeconsulting.com.ng` from Zoho CRM

- [ ] **Newsletter subscribes successfully**
  - Enter email in newsletter box
  - Verify email added to Zoho Campaigns list

- [ ] **Images load correctly**
  - All 20 images render without 404s
  - Networking & IT Infrastructure page shows correct image (after fix)

- [ ] **Mobile responsive**
  - Test on phone/tablet — no layout breaks
  - All CTAs clickable

- [ ] **SSL/HTTPS**
  - No mixed content warnings (all external resources over HTTPS)
  - SSL certificate is valid (not self-signed)

- [ ] **Performance**
  - Page loads in < 3 seconds on 4G
  - Lighthouse score > 70

### Monitoring & Alerts
- [ ] **DigitalOcean monitoring enabled**
  - Enable monitoring on both droplets (CPU, memory, disk)
  - Set up alerts to `info@stackprimeconsulting.com.ng`

- [ ] **Backup enabled on production**
  - Droplet → Backups → Enable
  - Weekly snapshots

---

## Phase 10: Launch & Post-Launch

### Pre-Launch Checklist
- [ ] All secrets configured (GitHub + droplets)
- [ ] DNS resolving correctly (A records propagated globally)
- [ ] TLS certificates issued (no SSL warnings)
- [ ] All integrations tested (Zoho, reCAPTCHA)
- [ ] CI/CD pipeline verified (at least one successful deploy)
- [ ] Monitoring & alerts active
- [ ] Backups enabled on production

### Launch
- [ ] **Announce domain to stakeholders**
- [ ] **Test from public internet** (not just localhost/internal)
- [ ] **Monitor logs** for errors in first 24 hours
  ```bash
  ssh deploy@<PRODUCTION_DROPLET_IP>
  docker compose logs marketing-site -f
  docker compose logs nginx -f
  ```

### Post-Launch (First Week)
- [ ] Monitor uptime (should be 99.9%+)
- [ ] Check email alerts from Zoho CRM for new leads
- [ ] Verify newsletter signups are working
- [ ] Monitor error logs, fix any 500s or issues found
- [ ] Performance: check Lighthouse scores weekly

---

## Phase 11: Future Phases (Phase 2+)

These are out of scope for Phase 1 but planned:

- [ ] **Phase 2: Web Solutions Tools** (tools.stackprimeconsulting.com.ng)
  - Speed test tool (functional)
  - VAPT assessment tool (functional)
  - File scan tool (functional)

- [ ] **Phase 3: SaaS Platform** (app.stackprimeconsulting.com.ng)
  - Organization admin panel
  - Catalog & entitlements
  - Software/app downloads

- [ ] **Phase 4: Training Academy Portal** (learn.stackprimeconsulting.com.ng)
  - Course catalog
  - Student dashboard
  - Live/recorded course access

---

## Summary of External Accounts & Costs

| Service | Cost | Status | Notes |
|---|---|---|---|
| Domain (stackprimeconsulting.com.ng) | $10–15/yr | ⚠️ Not purchased | Action needed |
| DigitalOcean (2 droplets + Spaces) | ~$34–40/mo | Pending | After Terraform apply |
| Zoho CRM | Free tier or ~$18/mo | Pending | Create account & register app |
| Zoho Campaigns | Free tier or ~$10/mo | Pending | Create account & newsletter list |
| Google reCAPTCHA v3 | Free (up to 1M requests/month) | Pending | Register at Google Console |
| GitHub Actions | Free (included in public repo) | Ready | No additional cost |
| **Estimated Total Phase 1** | **~$60–70/month** | **Pending** | Does not include labor |

---

## Key Contacts & Email Addresses

- **General inquiries:** stackprimeconsulting@gmail.com
- **Operations (forms/alerts/support):** info@stackprimeconsulting.com.ng
- **Deploy notifications:** Should go to operations email above

---

## Quick Reference: Git Branches & Deployment

| Branch | Environment | Deploy Trigger | Notes |
|---|---|---|---|
| `main` | production | Auto on merge (gated by GitHub environment) | Requires approval before deploy |
| `develop` | staging | Auto on merge | Faster feedback loop for testing |
| Feature branches | None | PR runs CI only (lint, type-check, build) | No deploy until merged |

---

## Document Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-09-14 | Initial checklist created — all phases mapped |

---

**Last Updated:** 2026-09-14  
**Next Review:** After Phase 1 deployment (expected 2026-10-15)  
**Owner:** Timothy Olubiyi, Founder & Chief Consultant
