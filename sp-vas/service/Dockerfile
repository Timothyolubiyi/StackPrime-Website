# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node node_modules/prisma/build/index.js generate
RUN node node_modules/typescript/bin/tsc

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 spvas && adduser --system --uid 1001 spvas
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/data /app/reports && chown -R spvas:spvas /app/data /app/reports

USER spvas
EXPOSE 4001
ENV PORT=4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4001/api/health || exit 1

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/server.js"]
