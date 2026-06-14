# canihavesex.today

A private, open-source **period + fertility-awareness** app. It answers one honest
question — *am I likely fertile today?* — and tracks your cycle, with no ads, no
tracking, and no data-harvesting.

> Not medical advice, and not a contraceptive. See the [Disclaimer](#disclaimer).

## What it is

canihavesex.today brings together period tracking and fertility awareness — two
sides of one cycle. From the signals you log (bleeding, basal body temperature,
cervical fluid, LH tests), it estimates today's fertility status alongside your
cycle context (cycle day, fertile window, next-period estimate).

Design principles:

- **Fertility-led and honest.** Today's status is the headline; period insights sit
  alongside it. When the signal is unclear, it assumes you're fertile — it never
  implies contraceptive safety.
- **Calm and minimal.** No ads, no upsells, no gamification. (See [BRAND.md](./BRAND.md).)
- **Yours.** Your data stays on your own instance. Self-host it in minutes.

## Features

- Daily logging: bleeding/flow, BBT, cervical fluid, LH tests — plus symptoms,
  mood, energy, sleep, libido, and notes
- Today's fertility status with a confidence signal
- Cycle context: cycle day, fertile window, next-period estimate, calendar, trends
- Email + password accounts out of the box (Google / OIDC optional)
- CSV export of your own data
- Mobile-first PWA with light and dark themes

## Tech stack

- **Frontend:** Astro + React (static SPA), Tailwind
- **Backend:** Node.js (Fastify) + TypeScript
- **Database:** PostgreSQL

## Self-hosting

The easiest path is Docker:

```bash
git clone https://github.com/OWNER/canihavesex.today.git
cd canihavesex.today
printf 'COOKIE_SECRET=%s\nPOSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)" "$(openssl rand -hex 16)" > .env
docker compose up -d --build
```

Open <http://localhost:3000> and create an account. Migrations run automatically on
boot and are non-destructive. Full guide: [SELF_HOSTING.md](./SELF_HOSTING.md).

## Local development

Requires Node 22 and a PostgreSQL database.

```bash
npm install
cp .env.example .env     # set COOKIE_SECRET (openssl rand -hex 32) and DATABASE_URL
npm run dev              # backend on :1299, frontend on :3112
```

- A single `.env` at the repo root configures both apps.
- `COOKIE_SECRET` (≥ 32 chars) and `DATABASE_URL` are required; Google OAuth is optional.

## Authentication

Email + password is the built-in default, so a fresh install needs no external
accounts. Google OAuth and generic OIDC activate automatically when their env vars
are set — the sign-in screen adapts to whatever is configured. See `.env.example`.

## Project layout

- `apps/backend` — Fastify API + the fertility engine (`src/engine.ts`)
- `apps/frontend` — Astro/React UI (Today / Log / Chart / Settings)

## How the fertility engine works

The engine (`apps/backend/src/engine.ts`) is the single source of truth; the
frontend only displays its results.

1. **Cycle segmentation** — a new cycle starts on medium/heavy bleeding after at
   least 18 days.
2. **Signals** — BBT shift, LH surge, peak (egg-white) cervical fluid, and a
   calendar fallback from average cycle length.
3. **Fusion** — a weighted blend (LH > BBT > fluid > calendar) estimates the
   ovulation day and a confidence score.
4. **Fertile window** — ovulation day −5 through +1.
5. **Daily status** — `period` on bleeding, `fertile` inside the window,
   `not_fertile` outside it, and `unsure` when the window has passed without a
   temperature-confirmed ovulation.

## Disclaimer

This is fertility-awareness software. It is **not medical advice** and **not a
contraceptive**, and it does not guarantee pregnancy prevention. When in doubt,
assume you are fertile, and consult a healthcare professional for medical decisions.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[GNU AGPL-3.0](./LICENSE). If you run a modified version as a network service, you
must make your source available under the same license.
