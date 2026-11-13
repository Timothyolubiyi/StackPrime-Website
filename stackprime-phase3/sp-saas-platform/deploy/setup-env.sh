#!/usr/bin/env bash
# Run ONCE on the droplet: creates .env and .env.api with fresh random secrets.
# It asks only for the things it cannot invent (the Zoho mail password, and optionally the Paystack key).
set -euo pipefail
cd "$(dirname "$0")"

if [ -e .env ] || [ -e .env.api ]; then
  echo "A .env or .env.api already exists here. Refusing to overwrite it (that would change your database password)." >&2
  exit 1
fi
umask 077

DOMAIN="app.stackprimeconsulting.com.ng"
SUPPORT="support@stackprimeconsulting.com.ng"

read -r -p "SMTP host for Zoho Mail [smtp.zoho.com] (paid Zoho plans often use smtppro.zoho.com; EU accounts smtp.zoho.eu): " SMTP_HOST
SMTP_HOST="${SMTP_HOST:-smtp.zoho.com}"
read -r -s -p "Password (or app password) for ${SUPPORT}: " SMTP_PASS; echo
[ -n "$SMTP_PASS" ] || { echo "The mail password is required in production." >&2; exit 1; }
read -r -s -p "Paystack SECRET key (sk_test_... or sk_live_...; press Enter to skip for now): " PAYSTACK; echo

PG_PASS="$(openssl rand -hex 24)"
REDIS_PASS="$(openssl rand -hex 24)"
JWT="$(openssl rand -base64 48 | tr -d '\n')"
MFA="$(openssl rand -base64 32 | tr -d '\n')"

cat > .env <<ENV
POSTGRES_USER=spsaas
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=sp_saas
REDIS_PASSWORD=${REDIS_PASS}

# "local" and manual-N tags are used while images are shipped from a PC; CI replaces them later.
DO_REGISTRY_NAMESPACE=local
API_TAG=manual-0

# Backups (needs the Spaces backups bucket; see deploy/README.md)
BACKUP_BUCKET=stackprime-saas-backups
BACKUP_ENDPOINT=
BACKUP_ACCESS_KEY=
BACKUP_SECRET_KEY=
ENV

cat > .env.api <<ENV
NODE_ENV=production
PORT=4000
APP_ORIGIN=https://${DOMAIN}
API_PUBLIC_URL=https://${DOMAIN}

DATABASE_URL=postgresql://spsaas:${PG_PASS}@postgres:5432/sp_saas?schema=public&connection_limit=5
REDIS_URL=redis://:${REDIS_PASS}@redis:6379

JWT_SECRET=${JWT}
MFA_ENC_KEY=${MFA}

SMTP_HOST=${SMTP_HOST}
SMTP_PORT=465
SMTP_USER=${SUPPORT}
SMTP_PASS=${SMTP_PASS}
MAIL_FROM="StackPrime Support <${SUPPORT}>"
ADMIN_NOTIFY_EMAIL=${SUPPORT}

PAYSTACK_SECRET_KEY=${PAYSTACK}
ENV

chmod 600 .env .env.api
echo
echo "Created .env and .env.api (readable only by you)."
echo "Keep a private copy of both in a password manager: if they are lost, the database password and the"
echo "encryption key for MFA secrets are lost with them."
