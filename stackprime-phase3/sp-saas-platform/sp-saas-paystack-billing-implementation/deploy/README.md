# Deploying to the Phase 3 droplet

One-time setup, after `terraform apply` has created the droplet (cloud-init installs Docker, swap and the `deploy` user):

1. Point `app.stackprimeconsulting.com.ng` at the droplet IP (see scope 5.5 item 3).
2. `scp -r sp-saas-platform/deploy/. deploy@<ip>:/opt/sp-saas/deploy/`
3. On the droplet, in `/opt/sp-saas/deploy`:
   - `cp .env.example .env` and set the passwords, `DO_REGISTRY_NAMESPACE`, backup keys.
   - Create `.env.api` from `../api/.env.example` with production values. Inside Docker the hosts are the service names:
     - `DATABASE_URL=postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>?schema=public&connection_limit=5`
     - `REDIS_URL=redis://:<REDIS_PASSWORD>@redis:6379`
     - `NODE_ENV=production`, `APP_ORIGIN=https://app.stackprimeconsulting.com.ng`, real `JWT_SECRET`, `MFA_ENC_KEY`, Zoho SMTP password.
   - `chmod 600 .env .env.api`
   - `./init-letsencrypt.sh support@stackprimeconsulting.com.ng` (port 80 must be free; DNS must already resolve).
   - Add the backup cron: `0 2 * * * /opt/sp-saas/deploy/backup.sh >> /var/log/sp-backup.log 2>&1`
4. GitHub repository secrets: `DO_TOKEN`, `DO_REGISTRY_NAMESPACE`, `SAAS_HOST` (droplet IP), `SAAS_SSH_KEY` (private key matching `deploy_public_key`), `SAAS_KNOWN_HOSTS` (output of `ssh-keyscan <ip>`), and for Terraform `SPACES_ACCESS_ID`, `SPACES_SECRET_KEY`.
5. Run the `SP SaaS - Deploy (production)` workflow once manually. After that, every merge to `main` that passes CI deploys automatically, and rolls the image tag back if `/readyz` does not come up.

Restore test (do this before launch): download a dump from the backups bucket, restore it into a scratch Postgres container, and confirm the tables are populated.
