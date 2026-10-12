# SP Fast Speed Test

Phase 2b of StackPrime's Web Solutions — the second of the two independently-deployed free browser tools (after SP VAS). Deployed on `speedtest.stackprimeconsulting.com.ng`, sharing the Phase 1 droplet and Nginx container with the marketing site and SP VAS.

## What it does

Visitor starts a test → server issues a short-lived session token → browser downloads then uploads timed payloads → browser submits the computed Mbps and latency numbers → server grades the result and generates a branded PDF report. Three free tests, then an upgrade prompt to SP Fast Enterprise.

**Single-region only** (deliberate): the droplet's own region is the only test point. SP Fast Enterprise's multi-region monitoring is the commercial differentiation — a free tool that already does multi-region would undercut the reason to upgrade.

## Structure

```
sp-fast-speedtest/
  service/
    src/
      lib/
        usage.ts      # 3-use limit + daily bytes-cap enforcement (dual layer)
        scoring.ts    # Download Mbps → Excellent / Good / Fair / Poor grade
        report.ts     # Branded PDF: letterhead, watermark, metrics, guide, CTA
      routes/
        health.ts     # GET /api/health
        speedtest.ts  # POST /start, GET /download, POST /upload, POST /submit,
                      # GET /report/:filename
      server.ts
    prisma/schema.prisma   # SQLite — ToolUsage, DailyTransfer, SpeedTestResult
    Dockerfile
    .env.example
  deploy/
    docker-compose.yml     # Own compose project, joins shared_nginx_net
    nginx/speedtest.conf   # Reverse proxy for speedtest.stackprimeconsulting.com.ng
  .github/workflows/
    deploy-sp-fast-speedtest.yml  # Path-filtered, builds on droplet
  terraform/
    main.tf            # DNS A record only — droplet owned by marketing-site infra
    variables.tf
    terraform.tfvars.example
```

## How the test flow works (why it's structured this way)

Speed measurement has to be timed client-side — the browser starts a timer, fires the download or upload request, and stops the timer when it completes. The server can't do this timing because it doesn't know when the data actually finished arriving at the browser.

The session-token architecture handles a subtle sequencing problem: the 3-use limit must be debited before the bandwidth is consumed (so a scripted client can't run unlimited downloads before the gate fires), but the result isn't available until after the download+upload run. Solution: `POST /start` debits usage and issues a token; all subsequent calls require that token and are scoped to the originating IP; `POST /submit` accepts the client's computed measurements, saves the result, generates the report, and invalidates the token (one-time use — can't be submitted twice).

## Dual-layer abuse prevention

1. **3-use limit** (business logic) — enforced in `usage.ts` by `ToolUsage`, keyed on fingerprint OR IP. Same dual-key model as SP VAS.
2. **Daily bytes cap** (bandwidth safety) — 500MB/day/IP via `DailyTransfer`. Covers 3 free tests (~30MB each) plus headroom for shared/office IPs, while bounding worst-case scripted abuse at a real cost level. This is the layer that makes SP Fast different from SP VAS operationally: SP VAS's checks are essentially free to serve; SP Fast moves real data.

## Two things to verify before deploying

1. **`manage_domain_resource`**: `stackprimeconsulting.com.ng` may or may not already exist as a DigitalOcean-managed DNS zone (depends on whether the marketing site's infra was already updated for the new domain). Check before `terraform apply` — only one Terraform state should own the zone. Set `manage_domain_resource = true` in your `.tfvars` only if no other state owns the zone yet.

2. **TLS certificate** — issue it the same way as SP VAS, on the droplet itself after the first deploy:
   ```bash
   ssh deploy@<droplet-ip>
   cd /opt/stackprime-marketing-site
   ./scripts/init-tls.sh speedtest.stackprimeconsulting.com.ng info@stackprimeconsulting.com
   docker compose exec nginx nginx -s reload
   ```

## Local development

```bash
cd service
npm install
cp .env.example .env
# Edit .env: change DATABASE_URL to file:./dev.db
npx prisma migrate dev --name init
npm run dev
```

Service runs on `http://localhost:4002`. Test the flow:

```bash
# Start a session
TOKEN=$(curl -s -X POST http://localhost:4002/api/speedtest/start \
  -H "Content-Type: application/json" \
  -d '{"fingerprint":"test-fp-1"}' | python3 -m json.tool)
echo $TOKEN

# Extract token and run download test (time it yourself for real Mbps)
curl -s "http://localhost:4002/api/speedtest/download?token=<token>&bytes=5242880" -o /dev/null -w "%{time_total}s downloaded\n"

# Submit results
curl -s -X POST http://localhost:4002/api/speedtest/submit \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>","downloadMbps":87.3,"uploadMbps":22.1,"latencyMs":14}'
```

## What was verified before delivery

- ✅ `tsc --noEmit` clean (verified against an accurate hand-crafted Prisma type stub matching the schema exactly — stub removed before packaging)
- ✅ PDF generation tested and visually inspected: letterhead, watermark, grade badge, three metrics, "Reading your results" guide, SP Fast Enterprise CTA footer
- ✅ Report is valid PDF (`%PDF-1.3` header, 185KB for a real test run)
- ✅ All routes present: `/api/health`, `/api/speedtest/start`, `/api/speedtest/download`, `/api/speedtest/upload`, `/api/speedtest/submit`, `/api/speedtest/report/:filename`
- ⚠️ `npx prisma generate` couldn't complete in the build sandbox (blocked from reaching `binaries.prisma.sh`) — must be run on your machine before first `npm run dev` or `docker build`

## Next: frontend integration

Same pattern as SP VAS — the backend is complete, but there is no frontend component yet on the marketing site's `/web-solutions/sp-fast-speedtest` page. That's the next piece: a React component that runs the timed download/upload sequence in the browser, calls these endpoints, and displays the graded result with a PDF download link.
