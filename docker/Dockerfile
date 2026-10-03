# syntax=docker/dockerfile:1

# ============================================================
# Base
# ============================================================
FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache libc6-compat

# ============================================================
# Dependencies
# ============================================================
FROM base AS deps

COPY marketing-site/package.json marketing-site/package-lock.json ./

RUN npm ci

# ============================================================
# Build
# ============================================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules

# Copy the Next.js application into the build context.
COPY marketing-site/ ./

# NEXT_PUBLIC_* values are baked into the Next.js build.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_ASSETS_CDN_URL

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_ASSETS_CDN_URL=$NEXT_PUBLIC_ASSETS_CDN_URL

# Prevent excessive memory usage during the Next.js build.
ENV NODE_OPTIONS=--max-old-space-size=1024

RUN npm run build

# ============================================================
# Runtime
# ============================================================
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone output.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK \
  --interval=30s \
  --timeout=5s \
  --start-period=10s \
  --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
