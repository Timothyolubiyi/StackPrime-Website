# SP VAS — Vulnerability Assessment (StackPrime Consulting Ltd)

The first of the two Phase 2 Web Solutions apps. Deployed independently of the marketing site and of SP Fast Speed Test, per the app-by-app split — its own Terraform state, its own deploy workflow, its own subdomain (`vas.stackprimeconsulting.com.ng`) — while still running on the shared Phase 1 droplet and appearing to visitors as part of stackprimeconsulting.com.ng.

## What it does

Visitor submits a URL or IP → SP VAS runs five passive, external checks against it → visitor gets a graded report (A–F) on-screen and as a branded PDF. Three free assessments, then an upgrade prompt pointing at the SaaS Platform (Phase 3).

**Checks performed** (all passive — no exploitation, no active penetration testing):
- TLS/certificate configuration (standard handshake, same as any browser)
- HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) + cookie flags
- DNS security posture (SPF, DMARC; DKIM flagged as unverifiable without a known selector)
- A short, fixed list of sensitive ports (FTP, SSH, Telnet, SMTP, MySQL, RDP, PostgreSQL, Redis), checked sequentially with a simple TCP connect — not a port sweep
- `robots.txt` / `security.txt` presence

This scope is deliberate: it's the same category of check as Qualys SSL Labs or SecurityHeaders.com, not a penetration test. Every target is validated before any check touches it (see "Safety controls" below).

## Structure

```
sp-vas/
  service/          # The Fastify + TypeScript + Prisma app itself
    src/
      lib/checks/    # The five passive check modules
      lib/target.ts  # Target validation + SSRF guard — read this first
      lib/scoring.ts # Findings → grade/score
      lib/report.ts  # Branded PDF generation (letterhead + watermark)
      lib/usage.ts   # 3-use free limit enforcement
      routes/        # scan.ts (main endpoint), health.ts
    prisma/schema.prisma  # SQLite — see the file for why, not Postgres
    Dockerfile
  deploy/
    docker-compose.yml    # Separate compose project, joins shared Nginx network
    nginx/vas.conf         # Reverse proxy config for vas.stackprimeconsulting.com.ng
  .github/workflows/
    deploy-sp-vas.yml      # Independent GitHub Actions deploy — only triggers on service/** changes
  terraform/
    main.tf            # DNS-only — droplet is owned by marketing-site-infra's state
    variables.tf
    terraform.tfvars.example
```

**Note on merging into the main repo:** if this folder gets merged alongside the marketing-site and website repos (as those two were), `.github/workflows/deploy-sp-vas.yml` needs to land in the combined repo's own `.github/workflows/` directory — GitHub Actions only discovers workflows there, not in `deploy/`. It's already placed correctly within this zip for that reason.

## Safety controls (read before deploying)

1. **SSRF guard** (`src/lib/target.ts`) — every submitted target is resolved and checked against private/loopback/link-local IP ranges before any check runs. This stops SP VAS from being pointed at the droplet's own internal network or a cloud metadata endpoint (169.254.169.254-style attacks).
2. **Consent required** — the API rejects any scan request without an explicit `consent: true` flag. The frontend must present this as a checkbox, not a pre-checked default.
3. **Global rate limit** — 20 requests/minute per IP at the Fastify level, independent of the 3-use business limit, so the droplet itself can't be flooded.
4. **Sequential port checks** — never parallelized, so a scan never looks like a burst/sweep to the target's own defenses.
5. **Path-traversal protection** on the report-serving endpoint (filename regex-validated before touching the filesystem).

## What was fixed during review

- Two TypeScript type errors (`tls.ts` certificate field typing, `target.ts` psl narrowing) — both real bugs, now fixed and verified with a clean `tsc --noEmit` pass.
- The deploy workflow and `docker-compose.yml` referenced a DigitalOcean Container Registry image — inconsistent with the lean $6/month build-on-droplet decision made for the marketing site. Rewritten to build directly on the droplet, matching that pattern.

## Known limitation in this environment

`prisma generate` / `prisma validate` couldn't complete here because the sandbox can't reach `binaries.prisma.sh` (network restriction, not a schema problem) — the Prisma client types were already generated successfully earlier in this build, and `tsc --noEmit` passes cleanly against them. Confirm `npx prisma generate` succeeds on a machine with normal internet access before first deploy.

## Deploy order

1. Confirm the marketing site's droplet is already up (its Terraform, separate repo).
2. `terraform apply` this module with `droplet_ipv4` set to that droplet's IP.
3. Manually create the shared Docker network once: `docker network create shared_nginx_net` on the droplet, and add the marketing site's `nginx` service to it (edit its `docker-compose.yml` — one line).
4. Push to `main` — `deploy-sp-vas.yml` builds and deploys independently of the marketing site's own workflow.
5. Issue the TLS cert for `vas.stackprimeconsulting.com.ng` the same way Phase 1's `scripts/init-tls.sh` did for the main domain.

## Next: SP Fast Speed Test

Per the agreed sequencing, SP Fast Speed Test is scoped and built the same way once SP VAS is confirmed live — its own `terraform/`, `deploy/`, and `service/`, sharing this same droplet and Nginx container.



## For Local Testing

1. Set up a local .env (different from the committed one)

The committed service/.env.example has production values (Docker-internal DB path, production CORS origins). For local testing, create service/.env:

bash
cd sp-vas/service
cat > .env << 'EOF'
PORT=4001
DATABASE_URL="file:./dev.db"
ALLOWED_ORIGINS="http://localhost:3000"
EOF

That ALLOWED_ORIGINS line matters — localhost:3000 and localhost:4001 are different origins as far as CORS is concerned, so without this the marketing site's browser requests would get blocked even if you build the frontend page next.

2. Install and set up the database
bash
npm install
npx prisma generate
npx prisma migrate dev --name init

That last command creates dev.db (SQLite) and the tables. Note: I couldn't fully verify prisma generate in my own sandbox (it couldn't reach Prisma's binary CDN there) — should work fine on your machine with normal internet access, but if it doesn't, that's the first thing to check.

3. Start the service
bash
npm run dev

Runs on http://localhost:4001 (separate from the marketing site's localhost:3000).

4. Test it directly
bash
# Health check
curl http://localhost:4001/api/health

# Run an actual assessment
curl -X POST http://localhost:4001/api/vas/scan \
  -H "Content-Type: application/json" \
  -d '{
    "target": "example.com",
    "fingerprint": "test-browser-123",
    "consent": true
  }'

You should get back JSON with grade, score, findings, and a reportUrl. Fetch that PDF with:

bash
curl -o report.pdf http://localhost:4001/api/vas/report/<filename-from-response>