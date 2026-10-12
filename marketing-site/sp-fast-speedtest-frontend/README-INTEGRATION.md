# SP Fast Speed Test frontend integration

## Files

Copy this folder into your existing Next.js App Router project (`marketing-site`):

- `app/web-solutions/sp-fast-speedtest/page.tsx`
- `app/web-solutions/sp-fast-speedtest/SpeedTestClient.tsx`

The page will be available at `/web-solutions/sp-fast-speedtest`.

## Environment variable

Set this in the marketing site's deployment environment and rebuild the Next.js app:

```env
NEXT_PUBLIC_SP_FAST_SPEEDTEST_API_URL=https://speedtest.stackprimeconsulting.com.ng
```

The component defaults to that URL if the variable is omitted.

## Backend requirements to verify before production

1. `GET /api/health` must be reachable from the browser and return a successful response. The component uses three short health requests as its latency estimate.
2. `ALLOWED_ORIGINS` in the speed-test backend must include the exact public origin of the marketing website (for example `https://stackprimeconsulting.com.ng`, and `https://www.stackprimeconsulting.com.ng` if the site is also served there). Do not use a wildcard unless you intentionally want that policy.
3. The upload route counts `Content-Length`; the component posts two fixed JSON payloads with a 5 MiB string each, below the route's 8 MiB cap and the server's 15 MiB body limit.
4. The test uses two 10 MiB downloads and two 5 MiB JSON uploads, approximately 30 MiB of nominal payload per completed run, plus small request overhead. Backend daily transfer limits and session/IP validation remain authoritative.
5. Confirm the backend's `GET /api/speedtest/report/:filename` route and PDF output are accessible over HTTPS.
6. The `/start` route returns HTTP 402 when the free limit is reached. This is handled as an upgrade prompt.

## Important behavior

- The test sizes and number of transfer calls are fixed in the frontend.
- The backend remains responsible for session validity, usage caps, daily transfer accounting, grading, and PDF generation.
- Latency is an indicative median of three browser requests to `/api/health`, not ICMP ping. It includes HTTP/TLS/network overhead.
- This component intentionally does not change Terraform, Nginx, Docker Compose, or the SP VAS application.
