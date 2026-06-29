# Privacy Review: Data Flow Mapping

## Title: Clear and Direct Data Boundaries

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Data Flow Mapping
**Affected Files:** `apps/backend/src/engine.ts`

**Evidence:**
Data flows cleanly:
`Client -> HTTPS API -> Fastify Route -> Engine/Repository -> Postgres DB`.
Logs requested via the export route (`/api/v1/user/export`) flow directly from the database back to the client as a CSV file. There are no side-channel data flows (e.g., streaming logs to a data warehouse, background analytics processing, or third-party marketing syncs).

**Privacy Risk:**
None identified in the flow. The trust boundaries are explicitly defined and contained entirely within the user's self-hosted or managed instance.

**Potential User Impact:**
High confidence that data submitted to the app stays inside the app.

**Suggested Direction:**
Document this simple architecture in a privacy policy to reassure users.

**Release Blocker:**
No
