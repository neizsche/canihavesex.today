# Privacy Review: Self-Hosting Privacy

## Title: Self-Hosting Isolation is Complete

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Self-Hosting Privacy
**Affected Files:** `docker-compose.yml`, `apps/backend/src/index.ts`

**Evidence:**
When a user launches `docker compose up -d`, the `app` container communicates solely with the local `db` container. No outbound requests are made to central servers, license servers, or metrics endpoints.

**Privacy Risk:**
Some self-hosted "open source" products include call-home telemetry for active instance tracking.

**Potential User Impact:**
The original developers learn the IPs and usage stats of privately hosted instances.

**Suggested Direction:**
Positive finding. The deployment is fully air-gappable (minus initial Docker image pulls if not built from source).

**Release Blocker:**
No
