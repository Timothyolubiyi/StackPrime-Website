# StackPrime SaaS frontend

React + TypeScript + Vite customer portal for `https://app.stackprimeconsulting.com.ng`.

## Local development

Requirements: Node.js 20 or newer.

```powershell
npm install
npm run dev
```

Vite serves the UI at http://localhost:5173. API calls use relative `/v1` paths. For local development, configure a Vite proxy to your API if needed; do not add production secrets to frontend environment variables.

## Production build

```powershell
npm run build
```

The production static site is generated in `dist/`. Copy the **contents** of `dist` into the existing deployment directory `deploy/web-dist/`.

The current Nginx configuration already:
- proxies `/v1/` to the API container;
- serves the SPA from `/srv/web`;
- falls back to `index.html` for client-side routes.

## Security notes

- Access tokens are held in memory, not localStorage.
- Refresh uses the existing HTTP-only refresh cookie with `credentials: include`.
- The interface relies on `/v1/me` permissions and never substitutes frontend role checks for backend authorization.
- MFA requirements returned by the API are not bypassed.
- Do not put API secrets, Paystack secret keys, database credentials or SMTP credentials in this frontend.

## Implemented in this starter

- Sign in and signup
- Session refresh and authenticated API client
- Dashboard and product catalogue
- Paystack checkout redirect and payment verification callback
- Entitlements, payment history and organisation purchase-order listing
- Organisation creation, member listing and basic invitations
- Account security status and sessions listing
- Responsive desktop and mobile layout

## Important follow-up before production

1. Complete and test MFA enrolment/recovery-code screens against the exact auth route schemas.
2. Confirm the API's `/auth/sessions` response shape and adjust session rendering if necessary.
3. Add invitation acceptance UI using the invitation token from the email link.
4. Add role editing/removal, organisation settings and audit-log pagination.
5. Test payment callback with Paystack test mode before enabling live customer transactions.
6. Add automated component and end-to-end tests.
