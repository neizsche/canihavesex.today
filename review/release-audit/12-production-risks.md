# Release Audit: Production Risks

## Title: Stateless Design Minimizes Operational Risk

This document ranks production risks by likelihood and impact.

### 1. Missing Database Backups (High Likelihood, Critical Impact)
* **Risk:** The provided `docker-compose.yml` mounts a local volume for Postgres. If the host machine dies, all user data is lost.
* **Mitigation:** The README explicitly provides backup commands, but users must manually automate this (e.g., via cron).
* **Direction:** This is acceptable for a self-hosted project, but emphasize the necessity of offsite backups in the documentation.

### 2. PWA Cache Desync (Medium Likelihood, Medium Impact)
* **Risk:** A bad frontend deployment breaks the service worker, causing users to see a blank screen or be unable to fetch new API data.
* **Mitigation:** `vite-plugin-pwa` is configured with `skipWaiting: true` to auto-update.
* **Direction:** Manual E2E verification of upgrades is necessary before pushing new versions.

### 3. Session Hijacking via Physical Device Access (Low Likelihood, High Impact)
* **Risk:** The lack of server-side session invalidation means a stolen signed cookie is valid until expiration.
* **Mitigation:** Cookies expire in 30 days.
* **Direction:** Implement a `sessions` table in the database in a future release.
