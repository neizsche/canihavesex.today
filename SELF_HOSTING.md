# Self-hosting canihavesex.today

Run your own private instance with Docker. One app container + Postgres, configured
by a single `.env`. Email + password login works out of the box — **no Google account
or external service required.**

## Requirements

- Docker + Docker Compose (Docker Desktop, or Docker Engine + the compose plugin)

## Quick start

To run your self-hosted instance using the pre-built image:

1. Download the `docker-compose.yml` file:

```bash
curl -sSL https://raw.githubusercontent.com/neizsche/canihavesex.today/main/docker-compose.yml -o docker-compose.yml
```

*(Alternatively, you can copy the contents of [docker-compose.yml](./docker-compose.yml) into a local `docker-compose.yml` file).*

2. Start the services:

```bash
docker compose up -d
```

*(Optional)* If you want to customize the database password, cookie secret, or port, you can create a `.env` file in the same directory:

```env
COOKIE_SECRET=your_cookie_secret_here    # generate with: openssl rand -hex 32
POSTGRES_PASSWORD=your_db_password_here  # generate with: openssl rand -hex 16
```

---

Open <http://localhost:3112>, click **Create account**, and sign in with an email
and password. That's it.

> The app runs DB migrations automatically on every boot. They are **non-destructive** —
> your data is safe across upgrades.

## Configuration

All config is environment variables (set them in `.env`, which Compose reads):

| Variable | Required | Default | Notes |
|---|---|---|---|
| `COOKIE_SECRET` | — | `default_cookie_secret_please_change_in_production_32_chars` | Session signing key. For production, generate with `openssl rand -hex 32`. |
| `COOKIE_SECURE` | — | `false` (when self-hosted) | Set to `true` if serving over HTTPS through a reverse proxy to ensure secure session cookies. |
| `POSTGRES_PASSWORD` | — | `canihavesex_secure_password_change_me` | Password for the Postgres database. |
| `POSTGRES_USER` / `POSTGRES_DB` | — | `canihavesex` | Bundled DB user/name. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | (unset) | Set both to add a "Continue with Google" button. |

The login screen adapts automatically: with no provider keys set it shows email +
password only; add the Google keys and the Google button appears on next start.

## Putting it behind a domain + HTTPS

Point a reverse proxy at the app's port. Example with [Caddy](https://caddyserver.com)
(automatic TLS):

```caddy
app.example.com {
    reverse_proxy localhost:3112
}
```

When serving over HTTPS through a proxy, set `TRUST_PROXY=1` in `.env` so the app
sees the correct protocol.

## Updating

To update your self-hosted instance to the latest version:

```bash
docker compose pull
docker compose up -d
```

Your data lives in the `db_data` Docker volume and persists across updates.

## Backups

```bash
# Back up
docker compose exec db pg_dump -U canihavesex canihavesex > backup.sql

# Restore
cat backup.sql | docker compose exec -T db psql -U canihavesex canihavesex
```

## Resetting Passwords

Since email sending (for password reset links) is not enabled by default in self-hosted environments, you can reset any user's password directly from the command line using the built-in CLI tool inside the running container:

```bash
docker compose exec app node apps/backend/dist/scripts/resetPassword.js user@example.com new_password
```

## Monitoring & Health

The Docker image includes a built-in healthcheck that queries the app's `/health` endpoint every 30 seconds. This endpoint tests the database connection and reports whether the service is functioning correctly.

You can inspect the health status of your container using:

```bash
docker compose ps
# Or using standard docker commands:
docker ps --filter "name=app"
```

If the database connection drops or the server hangs, the container status will change to `unhealthy`, allowing Docker Compose (with orchestrators) or your reverse proxy to handle restarts.

## Using an external database

To use a managed Postgres (e.g. Supabase, Neon, RDS) instead of the bundled one:
remove the `db` service, and set `DATABASE_URL` directly on the `app` service.
Managed providers usually require SSL — drop `DB_SSL=false` in that case.

## Notes

- This is fertility-awareness software, not medical advice or contraception.
- Licensed under [AGPL-3.0](./LICENSE): if you run a modified version as a network
  service, you must make your source available under the same license.
