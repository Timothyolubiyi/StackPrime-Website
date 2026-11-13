# Deploying the platform to its droplet

Server: the dedicated 1 GB droplet created by `terraform/sp-saas-platform`, reachable at `app.stackprimeconsulting.com.ng` (an A record at WhoGoHost pointing at the reserved IP).

There are two ways to deploy. **Start with the manual one** (`ship.ps1`); it needs no GitHub setup and shows every step. Automatic deploys through GitHub Actions come later.

## One-time server setup

All commands run in PowerShell on your PC, in the repo folder. `$HOME\.ssh\sp_admin` is your own key (root access, used for the certificate step); `$HOME\.ssh\sp_saas_deploy` is the deploy key.

1. **Check you can log in as the deploy user and the server finished its first-boot setup:**
   `ssh -i "$HOME\.ssh\sp_saas_deploy" deploy@app.stackprimeconsulting.com.ng "cloud-init status; docker --version; swapon --show"`
2. **Copy the deploy folder** and fix line endings and permissions:
   `scp -i "$HOME\.ssh\sp_saas_deploy" -r sp-saas-platform\deploy deploy@app.stackprimeconsulting.com.ng:/opt/sp-saas/`
   then `ssh -i "$HOME\.ssh\sp_saas_deploy" deploy@app.stackprimeconsulting.com.ng 'cd /opt/sp-saas/deploy && for f in ./*.sh nginx/app.conf docker-compose.yml; do sed -i "s/\r$//" "$f"; done && chmod +x ./*.sh'`
3. **Create the secrets** (interactive; has you type the Zoho mail password and, optionally, the Paystack key; everything else is generated):
   `ssh -t -i "$HOME\.ssh\sp_saas_deploy" deploy@app.stackprimeconsulting.com.ng "cd /opt/sp-saas/deploy && ./setup-env.sh"`
   Save a private copy of the two files it creates (`.env`, `.env.api`) in a password manager.
4. **Get the HTTPS certificate** (needs DNS to resolve already, and runs as root because it manages `/etc/letsencrypt`):
   `ssh -i "$HOME\.ssh\sp_admin" root@app.stackprimeconsulting.com.ng "cd /opt/sp-saas/deploy && ./init-letsencrypt.sh support@stackprimeconsulting.com.ng"`
5. **First deploy** (builds the image on your PC, uploads it, migrates the database, starts everything):
   `.\sp-saas-platform\deploy\ship.ps1 -Server app.stackprimeconsulting.com.ng`
6. **Create the product catalog:**
   `ssh -i "$HOME\.ssh\sp_saas_deploy" deploy@app.stackprimeconsulting.com.ng "cd /opt/sp-saas/deploy && docker compose run --rm api node dist/prisma/seed.js"`

Check: `https://app.stackprimeconsulting.com.ng/healthz` answers `{"status":"ok"}` and `/v1/catalog` lists the two products.

## Every later deploy

`.\sp-saas-platform\deploy\ship.ps1 -Server app.stackprimeconsulting.com.ng`

It builds, uploads, runs any new migrations, restarts, waits for the API to report ready, and **rolls back to the previous version by itself** if it does not. Only the two newest images are kept, so the disk does not fill up.

## Useful commands (run on the droplet as the deploy user, in `/opt/sp-saas/deploy`)

| Task | Command |
|---|---|
| See what is running | `docker compose ps` |
| API logs (live) | `docker compose logs -f api` |
| Restart the API | `docker compose restart api` |
| Make someone StackPrime staff | `docker compose run --rm api node dist/scripts/make-staff.js them@example.com` |
| Memory and swap use | `free -m` |
| Disk use | `df -h /` |

## Backups

- **Now:** weekly droplet backups (`enable_droplet_backups = true` in Terraform).
- **Better:** nightly database dumps. Create the Spaces backups bucket (`create_backups_bucket = true` in Terraform, plus a Spaces key pair), fill the `BACKUP_*` lines in `.env`, then add the cron job: `0 2 * * * /opt/sp-saas/deploy/backup.sh >> /var/log/sp-backup.log 2>&1`
- Test a restore before the first real customer: download a dump, restore it into a scratch Postgres container, and check the tables have rows.

## Automatic deploys (later)

`.github/workflows/sp-saas-deploy.yml` does the same rollout from GitHub. GitHub only reads workflows at the **root of the repository**, and its paths assume the repo root contains `sp-saas-platform/`. Move or adjust it once the repo layout is settled. Secrets it needs: `DO_TOKEN`, `DO_REGISTRY_NAMESPACE`, `SAAS_HOST`, `SAAS_SSH_KEY` (the private half of the deploy key), `SAAS_KNOWN_HOSTS` (output of `ssh-keyscan <host>`).
