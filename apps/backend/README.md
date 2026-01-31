# Backend Documentation

This service is the API and business-logic layer for `canihavesex.today`.

## Stack

- Runtime: Node.js + TypeScript
- HTTP framework: Fastify (with `fastify-type-provider-zod` for strong schema validation)
- Database: PostgreSQL via raw `pg`
- Auth: Google OAuth (via `google-auth-library`) + signed cookie sessions
- Data access style: repository classes over handwritten SQL
- Core domain logic: fertility engine in `src/engine.ts`

## Directory Structure

```text
apps/backend/
  package.json
  src/
    server.ts              # main backend entrypoint
    server-premium.ts      # placeholder premium entrypoint
    index.ts               # app factory, middleware, route registration
    env.ts                 # repo-root .env loader
    db.ts                  # PostgreSQL pool + Db wrapper
    migrate.ts             # startup schema creation
    auth.ts                # OAuth helpers and token verification
    apiKeys.ts             # API key generation, hashing, extraction
    rateLimiter.ts         # in-memory rate limiter
    engine.ts              # fertility/cycle inference engine
    routes/
      auth.ts              # login/session/signout routes
      logs.ts              # log read/write routes
      calendar.ts          # today/calendar/stats routes
      export.ts            # CSV export
      user.ts              # onboarding, deletion, API keys
    repositories/
      UserRepository.ts
      PreferencesRepository.ts
      ApiKeyRepository.ts
      LogRepository.ts
      CycleRepository.ts
      DailyStatusRepository.ts
      UserMetaRepository.ts
    utils/
      dates.ts             # ISO date + timezone helpers
    scripts/
      simulateUser.ts
```

## Backend Startup Flow

1. `src/server.ts` starts the process and calls `createApp()` from `src/index.ts`.
2. `src/env.ts` loads environment variables from repo-root `.env.{NODE_ENV}` and `.env`.
3. Fastify is created with:
   - request/response logging
   - proxy awareness
   - central error handling (with standardized Zod validation error responses)
   - Zod schema validation compilers (`validatorCompiler` and `serializerCompiler`)
4. Plugins are registered:
   - `@fastify/cors`
   - `@fastify/cookie`
   - `@fastify/formbody`
5. `src/db.ts` creates a PostgreSQL pool and returns a small DB abstraction with:
   - `query`
   - `exec`
   - `transaction`
   - `close`
6. `src/migrate.ts` creates tables/indexes at startup.
7. Auth and rate-limit hooks are attached.
8. Route modules are registered with their respective Zod schemas.
9. On `SIGTERM` or `SIGINT`, the server gracefully shuts down and securely closes the PostgreSQL pool to prevent connection leaks.

## Request Flow

Most requests follow this shape:

1. Fastify receives the request.
2. The request payload (params, querystring, body) is strictly validated against Zod schemas. Invalid requests are immediately rejected with a 400 Bad Request.
3. The auth hook in `src/index.ts` checks either:
   - signed `uid` cookie, or
   - API key for `POST /api/logs`
4. Route handler creates/uses repository instances.
4. Repository runs raw SQL through the shared `Db` wrapper.
5. Some routes also invoke `runFusionEngine()` and then persist derived results.

## Main Route Groups

### `src/routes/auth.ts`

- Starts Google OAuth
- Handles Google callback
- Creates/links users and identities
- Sets/clears signed session cookie
- Exposes:
  - `GET /api/auth/oauth/:provider/start`
  - `GET /api/auth/oauth/:provider/callback`
  - `POST /api/signout`
  - `GET /api/session`
  - `GET /api/session/check`

### `src/routes/logs.ts`

- Reads a single day log
- Provides log suggestions from yesterday
- Upserts daily logs
- Re-runs the fertility engine after writes when the log affects the current cycle

Write-through behavior:

1. Save log into `logs_v2`
2. Load all logs + user meta + known cycles
3. Run `runFusionEngine()`
4. Persist results into:
   - `daily_status_v2`
   - `cycles_v2`
   - `active_cycles_v2`

### `src/routes/calendar.ts`

- `GET /api/today`
  - reads cached status from `daily_status_v2`
  - recomputes if cache is missing or stale relative to latest log update
- `GET /api/calendar`
  - returns date-range statuses plus cycle-based summary cards
- `GET /api/stats`
  - aggregates cycle history for trend cards

### `src/routes/export.ts`

- Exports log history as CSV from `logs_v2`

### `src/routes/user.ts`

- Completes onboarding
- Initializes user meta and an initial active cycle
- Deletes user data or full account
- Manages API keys

## Database Access Pattern

The backend does not use Prisma, Drizzle, or another ORM.

Instead it uses:

- `src/db.ts` for connection pooling and transactions
- repository classes for domain-level SQL

This keeps the backend simple, but it means:

- schema changes are written manually in SQL
- table/column names matter directly in application code
- there is no migration history table or versioned migration folder right now

## Database Schema

The active schema is created inline in `src/migrate.ts`.

There is also a second bootstrap path in `UserMetaRepository.bootstrap()` that creates the V5 tables again as a safety net. In practice, the app relies on startup creation rather than a separate migration tool.

### Identity and account tables

#### `users`

- `id text primary key`
- `email text unique not null`
- `created_at text not null`

Purpose:
- canonical user record

#### `user_identities`

- `id text primary key`
- `user_id text not null`
- `provider text not null`
- `provider_user_id text not null`
- `email text`
- `created_at text not null`
- unique `(provider, provider_user_id)`

Purpose:
- maps OAuth provider identities to app users

#### `user_preferences`

- `user_id text primary key`
- `theme`
- `intent`
- `cycle_regularity`
- `context_flags`
- onboarding and education timestamps
- `updated_at`

Purpose:
- onboarding answers and UI/account preferences

#### `user_api_keys`

- `id uuid primary key`
- `user_id uuid not null`
- `name`
- `key_hash text unique not null`
- `key_prefix text not null`
- `created_at timestamp not null`
- `last_used_at timestamp`
- `revoked_at timestamp`

Purpose:
- per-user API keys, currently allowed only for `POST /api/logs`

#### `waitlist`

Legacy table kept by migration:

- `id uuid primary key`
- `email text unique not null`
- `source`
- `reason`
- `created_at timestamp with time zone`

### Cycle-tracking tables

#### `logs_v2`

Primary user-entered health data.

- `id uuid primary key`
- `user_id uuid not null`
- `date date not null`
- `bleeding text`
- `temperature decimal(5,2)`
- `mucus text`
- `lh_test text`
- `disturbances jsonb default '[]'`
- `symptoms jsonb default '[]'`
- `notes text`
- `created_at timestamp`
- `updated_at timestamp`
- unique `(user_id, date)`

Purpose:
- source of truth for day-by-day observations

#### `cycles_v2`

Completed cycles.

- `id uuid primary key`
- `user_id uuid not null`
- `start_date date not null`
- `end_date date not null`
- `ovulation_prediction date`
- `ovulation_confirmed_date date`
- `length integer`
- `period_length integer`
- `analysis_flags jsonb default '[]'`

Purpose:
- engine-generated historical cycle summaries

#### `active_cycles_v2`

Current active cycle only.

- `id uuid primary key`
- `user_id uuid not null unique`
- `start_date date not null`
- `end_date date`
- `ovulation_prediction date`
- `ovulation_confirmed_date date`
- `length integer`
- `period_length integer`
- `analysis_flags jsonb default '[]'`

Purpose:
- cached current-cycle state used alongside `cycles_v2`

#### `daily_status_v2`

Per-day engine output.

- `id uuid primary key`
- `user_id uuid not null`
- `date date not null`
- `fertility_status text not null`
- `phase text not null`
- `is_predicted boolean not null`
- `insights_payload jsonb not null`
- `engine_version text not null`
- `updated_at timestamp`
- unique `(user_id, date)`

Purpose:
- cached daily UI state for today/calendar views

#### `user_meta_v2`

- `user_id uuid primary key`
- `app_mode text default 'prevent'`
- `baseline_temp_avg decimal(5,2) default 36.5`
- `avg_cycle_length decimal(5,2) default 28.0`

Purpose:
- user-level engine inputs and defaults

## Source of Truth vs Derived Data

Source of truth:

- `users`
- `user_identities`
- `user_preferences`
- `user_api_keys`
- `logs_v2`
- `user_meta_v2`

Derived/cache tables:

- `cycles_v2`
- `active_cycles_v2`
- `daily_status_v2`

That distinction matters because the engine can regenerate the derived tables from logs plus user meta.

## Fertility Engine Role

`src/engine.ts` is the domain core.

It:

1. sorts logs
2. segments them into cycles
3. normalizes observations into engine days
4. interprets BBT, LH, mucus, and calendar signals
5. fuses those signals into an ovulation estimate
6. computes fertile-window statuses
7. emits:
   - cycle summaries
   - daily statuses
   - `insights_payload` for the frontend

Signal priority in the current code:

- LH
- BBT
- mucus
- calendar fallback

BBT is treated as the confirmation signal.

## Authentication Model

Interactive app auth:

- Google OAuth in `src/routes/auth.ts` (using the official `google-auth-library` to securely verify ID tokens)
- linked through `users` + `user_identities`
- stored in signed `uid` cookie

Automation/API auth:

- API key hashing in `src/apiKeys.ts`
- storage in `user_api_keys`
- currently only accepted for `POST /api/logs`

## Environment and Infrastructure Notes

Current backend code is PostgreSQL-only.

`src/db.ts` throws at startup if `DATABASE_URL` is missing, and it only accepts `postgres:` / `postgresql:` URLs.

That means some older setup text in the repo that mentions SQLite is stale relative to the current implementation.

Important env vars for the backend:

- `DATABASE_URL`
- `COOKIE_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `PUBLIC_BACKEND_BASE`
- `PUBLIC_APP_BASE`
- `FRONTEND_URL`
- `NODE_ENV`
- `TRUST_PROXY`

## Observations About the Current Schema

- The schema is managed in code, not with timestamped migration files.
- The V5 tables are created in two places: `src/migrate.ts` and `UserMetaRepository.bootstrap()`.
- There are no foreign-key constraints declared in the schema.
- Some user IDs are stored as `text` in account tables and as `uuid` in V2 cycle/log tables, so the code treats IDs as strings at runtime.

## Practical Mental Model

If you want to understand this backend quickly, think about it in four layers:

1. Fastify app shell in `src/index.ts`
2. route handlers in `src/routes/*`
3. repositories in `src/repositories/*`
4. fertility engine in `src/engine.ts`

And for the database, think about it in two buckets:

1. user-entered/account data
2. engine-generated cached projections
