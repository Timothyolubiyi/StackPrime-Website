#!/usr/bin/env bash
# Nightly Postgres dump -> private Spaces bucket (30-day expiry is set by Terraform).
# Cron (as deploy, in /opt/sp-saas/deploy):  0 2 * * * /opt/sp-saas/deploy/backup.sh >> /var/log/sp-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="/tmp/sp_saas_${STAMP}.sql.gz"

docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner | gzip -9 > "$FILE"

docker run --rm -v "$FILE:/dump.sql.gz:ro" \
  -e AWS_ACCESS_KEY_ID="$BACKUP_ACCESS_KEY" -e AWS_SECRET_ACCESS_KEY="$BACKUP_SECRET_KEY" \
  amazon/aws-cli --endpoint-url "$BACKUP_ENDPOINT" \
  s3 cp /dump.sql.gz "s3://${BACKUP_BUCKET}/daily/sp_saas_${STAMP}.sql.gz"

rm -f "$FILE"
echo "backup ok: sp_saas_${STAMP}.sql.gz"
