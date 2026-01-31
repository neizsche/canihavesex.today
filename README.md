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
- DB: PostgreSQL (required via `DATABASE_URL`)

## Repo layout

- `apps/backend` Fastify API + fertility engine
- `apps/frontend` Astro UI (Today / Log / Chart / Settings)

## Deployment

See [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) for deployment instructions using Railway + Vercel.

## Run locally 

See [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) for complete local development setup.

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and fill in your values (DATABASE_URL, GOOGLE_CLIENT_ID, etc.)
   ```

3. **Run backend**:
   ```bash
   npm run dev:backend
   ```
   Backend runs on `http://localhost:1299`

4. **Run frontend** (in a new terminal):
   ```bash
   npm run dev:frontend
   ```
   Frontend runs on `http://localhost:3112`

5. **Or run both together**:
   ```bash
   npm run dev
   ```

### Important Notes

- **PostgreSQL is required**: Set `DATABASE_URL` in `.env` (use Supabase Connection Pooling URL)
- **OAuth setup**: Add `http://localhost:1299/api/auth/oauth/google/callback` to Google OAuth redirect URIs
- **Environment variables**: See `.env.example` for all required variables

## API endpoints

- `GET /api/auth/oauth/:provider/start` – start OAuth flow (supports `google`)
- `GET /api/auth/oauth/:provider/callback` – OAuth callback
- `POST /api/signout` – logout
- `GET /api/session` – get current session (authenticated)
- `GET /api/session/check` – lightweight session check (unauthenticated)
- `GET /api/today` – returns today's status + insights
- `GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` – calendar range + quick stats
- `GET /api/stats` – cycle stats + history
- `GET /api/logs/:date` – get log for a date
- `GET /api/logs/suggestion?date=YYYY-MM-DD` – smart prefill suggestion
- `POST /api/logs` – upsert daily log
- `GET /api/export?includeNotes=true|false` – CSV export
- `POST /api/user/onboarding/complete` – complete onboarding
- `POST /api/user/data/delete` – delete all user data
- `POST /api/user/account/delete` – delete account + data
- `GET /health` – system health check


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

- `apps/backend/src/engine.ts` (Fusion engine)

Frontend only displays backend results.

### Engine overview (v5 fusion)

1. Cycle segmentation: a new cycle starts on `medium` or `heavy` bleeding after at least 18 days since the last cycle start.
2. Signals used for ovulation estimation: BBT shift (3 days above the mean of the previous 6), LH surge (ovulation ~1 day after), peak eggwhite mucus, and a calendar fallback from average cycle length.
3. Fusion: a weighted average of available signals (LH > BBT > mucus > calendar) produces an estimated ovulation day and confidence score.
4. Fertile window: estimated ovulation day minus 5 days through plus 1 day.
5. Daily status: `period` on bleeding, `fertile` inside the window, `not_fertile` outside the window, and `unsure` if the window has passed without BBT confirmation.

The engine also emits an `insights_payload` with confidence, notifications, and cycle stats for the UI.


## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to contribute to this project.

## License

All rights reserved.
