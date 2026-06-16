# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install dependencies (dev deps needed to build TypeScript + Astro).
# Copy manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci

# Copy sources and build.
COPY . .
# Build the frontend with a same-origin API (relative /api), then the backend,
# then drop dev dependencies so the runtime image stays small.
ENV NODE_ENV=production
ENV PUBLIC_BACKEND_BASE=""
RUN npm run build -w apps/frontend \
 && npm run build -w apps/backend \
 && npm prune --omit=dev

# ---- Runtime stage ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=1299 \
    FRONTEND_DIST=/app/frontend \
    DB_SSL=false

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --gid 1001 nodejs

# Production node_modules + built artifacts only.
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nodejs:nodejs /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=nodejs:nodejs /app/apps/frontend/dist ./frontend

USER nodejs

EXPOSE 1299
# server.js boots Fastify (API + static frontend) and runs DB migrations on start.
CMD ["node", "apps/backend/dist/server.js"]
