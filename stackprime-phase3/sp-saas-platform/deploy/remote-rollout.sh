#!/usr/bin/env bash
# Runs ON the droplet as the deploy user (ship.ps1 pipes it over SSH; CI can do the same).
# __TAG__ is replaced by the sender. Steps: load image -> migrate -> start API -> health check
# -> (rollback on failure) -> start nginx -> clean up old images.
set -euo pipefail
TAG="__TAG__"
cd /opt/sp-saas/deploy

# Files that came from Windows may have CRLF line endings, which break shell scripts and configs.
for f in ./*.sh nginx/app.conf docker-compose.yml; do sed -i 's/\r$//' "$f"; done
chmod +x ./*.sh

NS="$(grep '^DO_REGISTRY_NAMESPACE=' .env | cut -d= -f2)"
PREVIOUS="$(grep '^API_TAG=' .env | cut -d= -f2 || true)"
echo "previous tag: ${PREVIOUS:-none}   new tag: ${TAG}"

docker load -i /tmp/sp-saas-api.tar
rm -f /tmp/sp-saas-api.tar
sed -i "s/^API_TAG=.*/API_TAG=${TAG}/" .env

docker compose up -d postgres redis
docker compose run --rm api npx prisma migrate deploy
# Both SQL files are idempotent, so they are safe to run on every deploy.
docker compose run --rm api npx prisma db execute --file prisma/sql/constraints.sql --schema prisma/schema.prisma
docker compose run --rm api npx prisma db execute --file prisma/sql/audit_immutable.sql --schema prisma/schema.prisma
docker compose up -d api

ready=0
for _ in $(seq 1 18); do
  if docker compose exec -T api wget -qO- http://127.0.0.1:4000/readyz 2>/dev/null | grep -q ready; then ready=1; break; fi
  sleep 5
done

if [ "$ready" != 1 ]; then
  echo "The API did not become ready within 90 seconds. Last log lines:" >&2
  docker compose logs --tail 40 api >&2 || true
  if [ -n "${PREVIOUS:-}" ] && docker image inspect "registry.digitalocean.com/${NS}/sp-saas-api:${PREVIOUS}" >/dev/null 2>&1; then
    echo "Rolling back to ${PREVIOUS}" >&2
    sed -i "s/^API_TAG=.*/API_TAG=${PREVIOUS}/" .env
    docker compose up -d api
  fi
  exit 1
fi
echo "API is ready."

docker compose up -d nginx
sleep 3
if ! docker compose ps --status running --services | grep -qx nginx; then
  echo "WARNING: nginx is not running. If this is the first deploy, the HTTPS certificate is probably missing:" >&2
  echo "run ./init-letsencrypt.sh as root (see deploy/README.md), then: docker compose up -d nginx" >&2
fi

# Keep this tag and the previous one; delete older images so the 25 GB disk does not fill up.
docker images --format '{{.Repository}}:{{.Tag}}' | grep "/sp-saas-api:" | grep -v -e ":${TAG}\$" -e ":${PREVIOUS}\$" | xargs -r docker rmi || true
docker image prune -f >/dev/null || true
docker compose ps
echo "Deployed ${TAG}."
