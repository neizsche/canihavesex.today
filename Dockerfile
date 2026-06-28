# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install dependencies (dev deps needed to build TypeScript + Astro).
# Copy manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
# Use npm cache mount to speed up installation
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy sources and build.
COPY . .
# Build the frontend with a same-origin API (relative /api), then the backend.
ENV NODE_ENV=production
ENV PUBLIC_BACKEND_BASE=""
RUN npm run build -w apps/frontend \
 && npm run build -w apps/backend

# ---- Runtime stage ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=1299 \
    FRONTEND_DIST=/app/frontend \
    DB_SSL=false

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --gid 1001 nodejs

# Copy package manifests
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

# Install only backend production dependencies.
# Using a cache mount speeds up repeated local builds.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace=apps/backend --include-workspace-root

# Copy built artifacts
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/frontend/dist ./frontend

# Transfer ownership of the application directory to the nodejs user
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 1299

# Zero-dependency healthcheck using Node's built-in http module
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request('http://localhost:' + (process.env.PORT || 1299) + '/health', { timeout: 2000 }, (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); }); req.on('error', () => process.exit(1)); req.end();"

# server.js boots Fastify (API + static frontend) and runs DB migrations on start.
CMD ["node", "apps/backend/dist/server.js"]
