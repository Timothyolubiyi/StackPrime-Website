# Operations Quickstart

For the architecture rationale, see `README.md`. This is the "how do I actually run this" reference.

## First-time setup (once per new environment)

1. **Bootstrap Terraform state bucket** (once, ever — not per environment):
   ```bash
   export DO_SPACES_KEY=...
   export DO_SPACES_SECRET=...
   ./scripts/bootstrap-state-bucket.sh
   ```

2. **Generate a deploy SSH key pair** (once, shared across environments, or one per environment — team's call):
   ```bash
   ssh-keygen -t ed25519 -f ./deploy_key -C "stackprime-deploy"
   ```
   Add `deploy_key.pub` contents to `TF_VAR_ssh_public_key` when applying Terraform. Add `deploy_key` (private) to the GitHub Actions secret `DEPLOY_SSH_PRIVATE_KEY`.

3. **Set GitHub Actions secrets** (repo Settings → Secrets and variables → Actions):
   - `DIGITALOCEAN_TOKEN`
   - `DO_SPACES_KEY`, `DO_SPACES_SECRET`
   - `DEPLOY_SSH_PUBLIC_KEY`, `DEPLOY_SSH_PRIVATE_KEY`
   - `STAGING_DROPLET_IP`, `PRODUCTION_DROPLET_IP` (fill in after first `terraform apply`, see step 4)
   > **Note:** Zoho and reCAPTCHA credentials (`ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_CAMPAIGNS_LIST_KEY`, `RECAPTCHA_SECRET_KEY`) are runtime-only and are **not** stored as GitHub Actions secrets. Add them directly to each droplet's `/opt/stackprime-marketing-site/.env` file by hand (`ssh deploy@<droplet-ip>`) — they're never needed at Docker build time, only when the container starts.

4. **Provision infrastructure** — run the "Terraform Apply (manual)" workflow from the Actions tab, choosing `staging` first, then `production`. Or locally:
   ```bash
   cd terraform
   terraform init
   terraform apply -var-file=environments/production.tfvars
   ```
   Copy the `droplet_ip` output into the corresponding GitHub secret from step 3.

5. **Point DNS** — Terraform creates the DNS records automatically once the domain is added to your DigitalOcean account's DNS (Networking → Domains → add `stackprimeconsulting.com.ng`, then update your registrar's nameservers to DigitalOcean's, if not already done).

6. **Issue the first TLS certificate**, on the droplet itself, after the first successful `docker compose up -d`:
   ```bash
   ssh deploy@<droplet-ip>
   cd /opt/stackprime-marketing-site
   ./scripts/init-tls.sh stackprimeconsulting.com.ng you@stackprimeconsulting.com.ng
   docker compose exec nginx nginx -s reload
   ```

## Day-to-day deploys

- Push/merge to `develop` → auto-deploys to staging.
- Push/merge to `main` → auto-deploys to production (gated by the `production` GitHub Environment — configure required reviewers there for a manual approval step).

## Rolling back a bad production deploy

1. Find the previous good image tag (`prod-<sha>`) in the DO Container Registry or a prior Actions run.
2. Run the production deploy SSH step manually with that tag:
   ```bash
   ssh deploy@<production-ip>
   cd /opt/stackprime-marketing-site
   export REGISTRY_IMAGE=registry.digitalocean.com/stackprime/marketing-site:prod-<previous-sha>
   sed -i "s#^REGISTRY_IMAGE=.*#REGISTRY_IMAGE=${REGISTRY_IMAGE}#" .env
   docker compose pull && docker compose up -d
   ```

## Local development

```bash
cp .env.example .env   # fill in local values
docker compose -f docker-compose.dev.yml up
```
Site available at http://localhost:3000 with hot reload.

## Making infrastructure changes

1. Edit files under `terraform/`.
2. Open a PR — the "Terraform Plan" workflow comments the plan on the PR automatically.
3. Review the plan carefully, get it reviewed.
4. Merge, then run "Terraform Apply (manual)" from the Actions tab for the affected environment(s).

Never run `terraform apply` from a laptop against production without a corresponding merged PR — state and code will drift from what's reviewed.
