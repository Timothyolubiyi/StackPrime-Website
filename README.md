# StackPrime Marketing Site

The Public Marketing Site (Phase 1) for StackPrime Consulting Ltd — Next.js 14 (App Router), TypeScript, Tailwind CSS.

This repo is the actual website. It's designed to run inside the infrastructure already built in `stackprime-marketing-site-infra` (Terraform + Docker + Nginx + GitHub Actions) — see that repo's `INFRASTRUCTURE.md` and `OPERATIONS.md` for deployment.

## What's here

- **`app/`** — every route, using the Next.js App Router (folder = route, `page.tsx` = the page). No `index.html` — Next.js generates HTML from these components.
- **`components/`** — shared UI: header (mega-menu nav), footer, CTA buttons, the service-domain page template, contact form, newsletter signup.
- **`lib/site-data.ts`** — single source of truth for navigation, the five service domains, company info, and standards. Edit copy here rather than hunting through individual pages.
- **`public/images/`** — all 20 confirmed site images, already wired into their pages.

## Pages built

- Home, Services (overview), all 5 service domain pages, VAPT (flagship deep page)
- Training Academy, SaaS Products, Web Solutions (marketing shell — Phase 2 builds the actual tools)
- Get Started (intent router), About, Careers, Publications, Contact
- `/api/health` (matches the existing Docker healthcheck), `/api/contact` (placeholder — see below)

## Known gaps — read before deploying

1. **Contact form backend is a placeholder.** `app/api/contact/route.ts` currently just logs the submission and returns success. The real implementation needs to:
   - Verify a reCAPTCHA v3 token server-side
   - Call the Zoho CRM/Forms API to store the lead and trigger the notification email
   - Env vars are already documented in the infra repo's `.env.example` (`ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `RECAPTCHA_SECRET_KEY`, etc.) — not yet read anywhere in this code.

2. **`networking-1.jpg` is a duplicate of `networking-2.jpg`.** The original upload for the first Networking & IT Infrastructure image didn't persist correctly during review. Both image slots on `/services/networking-it-infrastructure` currently show the same photo. Re-supply the original and swap in `public/images/networking-1.jpg`.

3. **Web Solutions tools aren't functional.** The three tool cards (speed test, VAPT assessment, file scan) are marketing copy only — "Coming soon." Matches the agreed Phase 2 sequencing; the actual tool backends are a separate build.

4. **Fonts require internet access at build time.** `next/font/google` (Source Serif 4, Inter) fetches font files during `next build`. This failed in the sandbox (no network to fonts.googleapis.com) but will succeed anywhere with normal internet access — GitHub Actions, the droplet, or a local machine. Confirmed via `tsc --noEmit`, ESLint, and a full route smoke test in dev mode instead.

5. **Publications page has no real content yet** — intentional empty state ("launching soon") per the site structure doc.

## Local development

```bash
npm install
cp .env.example .env   # if/when env vars are needed — see infra repo
npm run dev
```
Visit http://localhost:3000.

## Verified before delivery

- ✅ `tsc --noEmit` — no type errors
- ✅ `next lint` — no errors (fixed 9 unescaped-apostrophe issues)
- ✅ All 17 routes return HTTP 200 in dev mode
- ✅ Contact API validates required fields (400 on missing, 200 on valid submission)
- ⚠️ `next build` not verified in this environment due to the font-fetch network restriction above — verify on first real deploy (GitHub Actions will do this automatically on push).

## Brand notes

Cambria/Calibri from the brand documents are Microsoft-licensed fonts, not safely embeddable on the web. Substituted with the closest free, web-licensed equivalents: **Source Serif 4** (headings) and **Inter** (body). Colors, logo, and the eyebrow-label pattern from the approved decks are unchanged.
