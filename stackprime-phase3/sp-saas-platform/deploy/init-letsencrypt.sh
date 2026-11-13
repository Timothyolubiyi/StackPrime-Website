#!/usr/bin/env bash
# One-time certificate issuance (run BEFORE `docker compose up -d`, port 80 must be free), then weekly renewal.
# Usage: ./init-letsencrypt.sh you@example.com
set -euo pipefail
EMAIL="${1:?usage: $0 <email>}"
DOMAIN="app.stackprimeconsulting.com.ng"

sudo docker run --rm -p 80:80 -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot \
  certonly --standalone --non-interactive --agree-tos -m "$EMAIL" -d "$DOMAIN"

# Weekly renewal through the webroot served by nginx, then reload nginx.
( sudo crontab -l 2>/dev/null; echo "0 3 * * 1 docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v sp-saas_certbot-webroot:/var/www/certbot certbot/certbot renew --webroot -w /var/www/certbot --quiet && docker exec sp-saas-nginx-1 nginx -s reload" ) | sudo crontab -
echo "certificate issued for $DOMAIN"
