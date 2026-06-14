# Self-hosting canihavesex.today

Run your own private instance with Docker. One app container + Postgres, configured
by a single `.env`. Email + password login works out of the box — **no Google account
or external service required.**

## Requirements

- Docker + Docker Compose (Docker Desktop, or Docker Engine + the compose plugin)

## Quick start

```bash
git clone https://github.com/OWNER/canihavesex.today.git
cd canihavesex.today

# 1. Create a .env with two secrets
cat > .env <<EOF
COOKIE_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
EOF

# 2. Build and start
docker compose up -d --build
```

Open <http://localhost:3000>, click **Create account**, and sign in with an email
and password. That's it.

> The app runs DB migrations automatically on every boot. They are **non-destructive** —
> your data is safe across upgrades.

## Configuration

All config is environment variables (set them in `.env`, which Compose reads):

| Variable | Required | Default | Notes |
|---|---|---|---|
| `COOKIE_SECRET` | ✅ | — | Session signing key. `openssl rand -hex 32`. |
| `POSTGRES_PASSWORD` | ✅ | — | Password for the bundled Postgres. |
| `APP_PORT` | — | `3000` | Host port the app is published on. |
| `POSTGRES_USER` / `POSTGRES_DB` | — | `canihavesex` | Bundled DB user/name. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | (unset) | Set both to add a "Continue with Google" button. |

The login screen adapts automatically: with no provider keys set it shows email +
password only; add the Google keys and the Google button appears on next start.

## Putting it behind a domain + HTTPS

Point a reverse proxy at the app's port. Example with [Caddy](https://caddyserver.com)
(automatic TLS):

```caddy
app.example.com {
    reverse_proxy localhost:3000
}
```

When serving over HTTPS through a proxy, set `TRUST_PROXY=1` in `.env` so the app
sees the correct protocol.

## Updating

```bash
git pull
docker compose up -d --build
```

Your data lives in the `db_data` Docker volume and persists across updates.

## Backups

```bash
# Back up
docker compose exec db pg_dump -U canihavesex canihavesex > backup.sql

# Restore
cat backup.sql | docker compose exec -T db psql -U canihavesex canihavesex
```

## Using an external database

To use a managed Postgres (e.g. Supabase, Neon, RDS) instead of the bundled one:
remove the `db` service, and set `DATABASE_URL` directly on the `app` service.
Managed providers usually require SSL — drop `DB_SSL=false` in that case.

## Notes

- This is fertility-awareness software, not medical advice or contraception.
- Licensed under [AGPL-3.0](./LICENSE): if you run a modified version as a network
  service, you must make your source available under the same license.
