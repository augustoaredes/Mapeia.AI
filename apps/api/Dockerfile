FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app
COPY apps/api/package*.json ./
RUN npm ci --include=dev
COPY apps/api/ .
RUN npm run build
RUN npx prisma generate

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:20-alpine

# Docker CLI + OpenSSL (necessário para Prisma)
RUN apk add --no-cache docker-cli curl openssl

WORKDIR /app

COPY apps/api/package*.json ./
RUN npm ci --omit=dev

# Prisma client + schema
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY apps/api/prisma ./prisma

# Build compilado
COPY --from=builder /app/dist ./dist

# Storage de uploads/outputs (volume externo em prod)
RUN mkdir -p /app/storage

EXPOSE 3001

# Roda worker ou servidor conforme a variável WORKER_MODE
CMD ["sh", "-c", "if [ \"$WORKER_MODE\" = \"true\" ]; then node dist/workers/index.js; else npx prisma db push --skip-generate && node dist/index.js; fi"]
