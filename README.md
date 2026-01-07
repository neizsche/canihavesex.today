# canihavesex.today (MVP)

Mobile-first Micro‑SaaS PWA for **today’s biological pregnancy risk** estimation.

## Philosophy / constraints (non‑negotiable)

- This app **does not** predict periods.
- This app **does not** generate a future calendar or “safe days”.
- This app **does not** promise contraception or safety.
- This app shows only:
  - **Today’s risk**: `HIGH` / `MEDIUM` / `LOW`
  - A short, conservative explanation
- If uncertain: **assume fertile**.

Every screen shows the disclaimer:

> This is not medical advice. This does not guarantee pregnancy prevention.

## Tech

- Frontend: Astro (mobile-first minimal UI)
- Backend: Node.js (Fastify) + TypeScript
- DB: SQLite for dev (default), Postgres via `DATABASE_URL`

## Repo layout

- `apps/backend` Fastify API + fertility engine
- `apps/frontend` Astro UI (Today / Log / Chart / Settings)

## Run locally

1. Install deps (workspace root):

```bash
npm install
```

2. Run backend (with seed data):

```bash
SEED=1 npm run dev -w apps/backend
```

Backend runs on `http://127.0.0.1:8787`.

3. Run frontend:

```bash
npm run dev -w apps/frontend
```

Frontend runs on `http://localhost:3000`.

If you want the frontend to talk to a different backend URL, set:

- `PUBLIC_API_BASE` (e.g. `http://127.0.0.1:8787`)

## API endpoints

- `POST /api/auth` – sets a cookie session for a given email (MVP auth)
- `POST /api/log-day` – save a daily log
- `GET /api/today` – returns today’s risk + explanation
- `GET /api/chart` – returns current cycle timeline + per-day risk/index
- `POST /api/reset-cycle` – create a new cycle starting today
- `POST /api/delete-all-data` – delete cycles + logs for current user

## Data model (MVP)

Tables:

- `users`
- `cycles`
- `daily_logs`

`daily_logs` fields:

- `date`
- `mucusType`
- `sensation`
- `bleeding`
- `temperature` (optional)
- `lhTest`
- `createdAt`

## Fertility engine (authoritative)

All fertility logic lives in:

- `apps/backend/src/fertilityEngine.ts`

Frontend only displays backend results.

### 1) Fertility index

Per day, compute `fertilityIndex`:

- `dry = 0`
- `sticky = 2`
- `creamy = 4`
- `watery = 6`
- `eggwhite = 8`

If `sensation == slippery`:

- `fertilityIndex = max(fertilityIndex, 7)`

### 2) Cycle state machine

`CycleState`:

- `INFERTILE_PRE`
- `FERTILE_OPEN`
- `PEAK_FERTILE`
- `FERTILE_CLOSING`
- `INFERTILE_POST`

Rules:

- A **new cycle starts only** when `bleeding` is `light` or `heavy` (not spotting).
- Fertility **opens** when `fertilityIndex >= 4`.
- **Peak day** is the **last day** of the highest fertility index before it permanently drops.
- After peak has occurred, state becomes `FERTILE_CLOSING`.
- Fertility can become `INFERTILE_POST` only if:
  - at least **3 days since peak**, and
  - **temperature shift is confirmed**.

### 3) Temperature shift confirmation

A temperature shift is confirmed when:

- There exist **3 consecutive usable temperatures**
- Each is higher than the **maximum of the previous 6 usable temperatures**

Temperatures are ignored if that day is marked:

- sick
- bad sleep
- alcohol

(Those flags exist in the schema; the MVP UI doesn’t expose them yet.)

### 4) LH rule

If LH is `positive`:

- force `HIGH` risk for that day and the next day (carryover)

### 5) Risk calculation

Return:

- `HIGH` if:
  - `fertilityIndex >= 6`, or
  - `cycleState` in `FERTILE_OPEN` / `PEAK_FERTILE`, or
  - LH positive (today or carryover)
- `MEDIUM` if:
  - `fertilityIndex == 4`, or
  - `cycleState == FERTILE_CLOSING` **without** temperature confirmation
- `LOW` only if:
  - `cycleState == INFERTILE_POST`

Safety rule: if anything is uncertain, the engine defaults to **fertile** (never false safety).
