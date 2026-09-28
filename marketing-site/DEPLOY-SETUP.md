# Production Deployment Setup

**Last updated:** 2026-09-28 22:20 (Secrets injection fix - testing deployment)

## GitHub Actions Secrets Required

The following secrets must be configured in your GitHub repository settings (`Settings > Secrets and variables > Actions`) for the production deployment workflow to work:

### Deployment & SSH (Required)

**1. `PRODUCTION_DROPLET_IP`**
- **Value:** The public IPv4 address of your DigitalOcean production droplet
- **How to get it:** After running `terraform apply`, you can find it in:
  - Terraform output: `terraform output droplet_ip`
  - DigitalOcean dashboard: Droplets → stackprime-marketing-production → IPv4 address

**2. `DEPLOY_SSH_PRIVATE_KEY`**
- **Value:** The private SSH key (in OpenSSH format) corresponding to the public key used in Terraform
- **How to generate:**
  ```bash
  ssh-keygen -t ed25519 -f deploy_key -N ""
  ```
- **Usage:**
  - Store the contents of `deploy_key` (private) in GitHub secret
  - Store the contents of `deploy_key.pub` (public) in the Terraform variable `ssh_public_key`
  - **Never commit the private key to git**

### Application Configuration (Optional, but required for Contact/Newsletter forms)

**3. `RECAPTCHA_SITE_KEY`** and **4. `RECAPTCHA_SECRET_KEY`**
- **Value:** reCAPTCHA v3 keys from Google Cloud Console
- **Purpose:** Spam protection on the Contact Us form
- **Get keys:** https://console.cloud.google.com/security/recaptcha

**5-10. Zoho Integration Secrets** (for Contact Us form and Newsletter)
- `ZOHO_CLIENT_ID` — OAuth client ID from Zoho Developer Console
- `ZOHO_CLIENT_SECRET` — OAuth client secret
- `ZOHO_REFRESH_TOKEN` — Long-lived refresh token (requires manual OAuth flow)
- `ZOHO_CAMPAIGNS_LIST_KEY` — Zoho Campaigns list ID for newsletter subscribers
- `ZOHO_AUTHORIZATION_CODE` — Authorization code from Zoho OAuth
- **Get setup:** Zoho CRM Developer Console → Connected Apps

## Deployment Flow

1. Push changes to the `main` branch (excluding `terraform/**` and `README.md`)
2. GitHub Actions automatically:
   - Copies source code to the droplet via SCP
   - Builds Docker images on the droplet
   - Starts the containers
   - Verifies health with up to 30 retry attempts (60 seconds)

## Troubleshooting

### "Health check failed"
- Check droplet logs: SSH into the droplet and run `docker compose logs`
- Verify the Next.js app is running: `docker compose ps`
- Test the health endpoint: `curl https://stackprimeconsulting.com.ng/api/health`

### SSH Connection Failed
- Verify `PRODUCTION_DROPLET_IP` is correct and the droplet is running
- Verify `DEPLOY_SSH_PRIVATE_KEY` matches the public key registered on the droplet
- Check firewall rules allow SSH (port 22) from GitHub Actions runner IPs

### DNS Not Resolving
- Wait 24 hours for DNS propagation after Terraform apply
- Verify DNS records in DigitalOcean dashboard: Networking → Domains → stackprimeconsulting.com.ng

## Manual Rollback

If a deployment fails and you need to rollback:

1. SSH into the production droplet
2. Check available images: `docker image ls`
3. Update `docker-compose.yml` to use a previous image hash
4. Redeploy: `docker compose pull && docker compose up -d`
