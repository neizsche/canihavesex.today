# Backend

This is the Node.js / Fastify backend for canihavesex.today.

## Purpose & Responsibilities

- **Fertility Engine**: Houses the core deterministic algorithm (`src/engine.ts`).
- **Data Access Layer**: Handles all reads/writes to the PostgreSQL database (`src/repositories/`).
- **API Endpoints**: Exposes JSON REST endpoints for the frontend to consume.
- **Authentication**: Manages sessions, passwords, and OAuth/OIDC integrations.

## Core Modules

- `src/server.ts`: The main entry point, registering routes and starting Fastify.
- `src/engine.ts`: The pure function that takes user logs and outputs daily fertility statuses. **Do not modify this without extreme caution.**
- `src/routes/`: Route handlers organized by feature (auth, user, log, calendar, billing).
- `src/db.ts`: PostgreSQL connection pool and helper functions.

## Context

For architectural decisions, refer to `../../ARCHITECTURE.md`.
For testing instructions, see `package.json` (`npm run test`).
