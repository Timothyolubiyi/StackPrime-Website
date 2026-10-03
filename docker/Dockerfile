# syntax=docker/dockerfile:1

# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ---- Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* build args are baked in at build time; runtime-only secrets
# (contact form provider key, etc.) are injected via docker-compose env vars
# instead, never as build args.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_ASSETS_CDN_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_ASSETS_CDN_URL=$NEXT_PUBLIC_ASSETS_CDN_URL
ENV NODE_OPTIONS=--max-old-space-size=1024
RUN npm run build

# ---- Runtime ----
# Uses Next.js "standalone" output (next.config.js: output: "standalone")
# to keep the final image small — only the files actually needed to run.
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
