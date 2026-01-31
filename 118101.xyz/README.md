# Uptime Mini

A minimal, modern uptime monitor for a single URL. It pings once per minute via a Vercel Cron job, stores results in Vercel KV, and renders a clean 24-hour availability view.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with:

```bash
KV_REST_API_URL=""
KV_REST_API_TOKEN=""
KV_REST_API_READ_ONLY_TOKEN=""
```

3. Run the dev server:

```bash
npm run dev
```

## Deploy on Vercel

1. Create a Vercel KV database and connect it to this project.
2. Add the KV environment variables in the Vercel dashboard.
3. Deploy. The cron schedule in `vercel.json` will trigger `/api/ping` every minute.

## Optional security

If you want to lock down the ping route, set `CRON_SECRET` and call `/api/ping?secret=YOUR_SECRET` from your scheduler.

## Notes

- Results are stored for ~3 days; the UI displays the most recent 24 hours.
- The UI refreshes every 30 seconds.
