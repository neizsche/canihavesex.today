# Engineering Review: Scalability

## Title: Stateless API Enables Horizontal Scaling

**Severity:** Informational
**Confidence:** High
**Category:** Scalability
**Affected Files:** `apps/backend/src/index.ts`

**Evidence:**
The backend relies entirely on the PostgreSQL database and signed cookies for state. There are no in-memory user sessions tracking authentication.

**Engineering Impact:**
The backend container is stateless. You can horizontally scale Fastify instances behind a load balancer without configuring Redis for sticky sessions or shared session stores. The primary scalability bottleneck will simply be the Postgres instance size.

**Suggested Direction:**
Positive finding. Ensure any future feature additions (like WebSocket notifications) do not accidentally introduce stateful requirements that break this horizontal scalability.

**Estimated Effort:** Small
**Release Blocker:** No
