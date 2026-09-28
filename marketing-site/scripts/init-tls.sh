#!/usr/bin/env bash
# Run this ONCE per environment, on the droplet itself, after the first
# `docker compose up -d` and after DNS has propagated (the A record must
# already resolve to this droplet, or the ACME HTTP-01 challenge will fail).
#
# Usage: ./init-tls.sh stackprimeconsulting.com.ng you@stackprimeconsulting.com.ng
# For staging:
#   ./init-tls.sh staging.stackprimeconsulting.com.ng you@stackprimeconsulting.com.ng

set -euo pipefail

DOMAIN="${1:?Usage: init-tls.sh <domain> <email>}"
EMAIL="${2:?Usage: init-tls.sh <domain> <email>}"

docker compose run --rm --entrypoint "" certbot \
  certbot certonly \
  --webroot -w /var/www/certbot \
  -d "${DOMAIN}" \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email

echo "Certificate issued for ${DOMAIN}. Reload nginx to pick it up:"
echo "  docker compose exec nginx nginx -s reload"
