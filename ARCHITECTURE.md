# Architecture Overview

This document describes the high-level architecture of `canihavesex.today`. For product philosophy and core rules, see [AI_CONTEXT.md](./AI_CONTEXT.md).

## System Architecture

The repository is a monorepo containing two main applications:
1. **Frontend**: An Astro-powered static site with React for interactive components.
2. **Backend**: A Node.js Fastify API backed by a PostgreSQL database.

These are loosely coupled. The backend provides RESTful JSON endpoints, and the frontend consumes them.

## Major Modules

### Frontend (`apps/frontend`)
- **Pages** (`src/pages`): Astro files defining the static routes (e.g., `/`, `/log`, `/settings`).
- **Components** (`src/components`): React components organized by feature (e.g., `today`, `log`, `chart`, `settings`).
- **Hooks & State** (`src/hooks`, `src/components/log/logState.ts`): React Query for remote data, local state for complex forms (like the logging screen).

### Backend (`apps/backend`)
- **API Routes** (`src/routes`): Fastify route definitions (Auth, User, Log, Calendar, Settings).
- **Core Engine** (`src/engine.ts`): The pure, deterministic business logic that calculates fertility status based on historical logs.
- **Repositories** (`src/repositories`): Data access layer encapsulating raw SQL queries to PostgreSQL.
- **Services** (`src/email.ts`, `src/billing/`): Integrations with external providers (Resend, Dodo Payments).

## Data Flow

1. **User Input**: User interacts with a React form (e.g., logging today's BBT).
2. **API Request**: Frontend sends a POST request to the backend.
3. **Database Write**: The Fastify route calls a Repository, which writes to PostgreSQL.
4. **Engine Re-calculation**: When viewing the 'Today' screen, the backend fetches all relevant logs from the database, passes them to the **Engine**, and returns the derived fertility status to the frontend.
5. **Rendering**: The frontend renders the status dynamically.

## Request Lifecycle

- **Authentication**: Handled via secure, HTTP-only cookies (`auth.ts`). Middlewares verify session validity before allowing access to protected routes.
- **Validation**: API inputs are validated using Zod schemas (`fastify-type-provider-zod`).
- **Error Handling**: Standardized HTTP error responses. The frontend uses React Query to handle loading and error states.

## Dependency Graph

```mermaid
graph TD;
    Frontend[Frontend (Astro/React)] -->|HTTP API| Backend[Backend (Fastify)]
    Backend -->|SQL| DB[(PostgreSQL)]
    Backend -->|Pure Logic| Engine[Engine (engine.ts)]
    Backend -->|Emails| Resend[Resend API]
    Backend -->|Billing| Dodo[Dodo Payments]
```

## State Flow (Frontend)

- **Server State**: Managed by `@tanstack/react-query`. Caches API responses and handles optimistic updates.
- **UI State**: Handled by React `useState`/`useReducer`. The complex Log screen uses a state machine / reducer pattern (`logState.ts`) to manage draft logs before submission.

## Build Pipeline

- **Frontend**: `astro build` generates static assets and a client-side bundle.
- **Backend**: `tsc` compiles TypeScript to JavaScript (`dist/`).
- **Docker**: The `Dockerfile` at the root builds both apps and serves them via a unified container strategy (or using `docker-compose` for local/self-hosting).

## Deployment Overview

- **Self-Hosting**: The primary deployment model is via `docker-compose`. Users run the Postgres DB and the Node.js backend/frontend themselves.
- **Cloud (Managed)**: Deployed as a standard Node.js service (backend) and static hosting (frontend), though the monorepo Dockerfile allows unified deployment.

---
*For design decisions, see `docs/adr/`.*
