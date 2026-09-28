#!/usr/bin/env bash
# Swaps the production domain in the committed nginx conf for the target
# environment's domain before deploying. Run by the GitHub Actions deploy
# workflow, not typically by hand.
#
# Usage: ./render-nginx-conf.sh staging.stackprimeconsulting.com.ng

set -euo pipefail

SITE_DOMAIN="${1:?Usage: render-nginx-conf.sh <domain>}"
SRC="nginx/conf.d/stackprimeconsulting.conf"

if [[ "${SITE_DOMAIN}" == "stackprimeconsulting.com.ng" ]]; then
  echo "Production domain — no substitution needed."
  exit 0
fi

sed -i.bak \
  -e "s/stackprimeconsulting\.com www\.stackprimeconsulting\.com/${SITE_DOMAIN}/g" \
  -e "s#/etc/letsencrypt/live/stackprimeconsulting\.com#/etc/letsencrypt/live/${SITE_DOMAIN}#g" \
  "${SRC}"
rm -f "${SRC}.bak"

echo "Rendered nginx config for ${SITE_DOMAIN}."
