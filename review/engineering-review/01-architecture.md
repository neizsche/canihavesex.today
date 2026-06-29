# Engineering Review: Architecture

## Title: Pragmatic Layered Architecture

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Project Architecture
**Affected Files:** `apps/backend/src/`

**Evidence:**
The backend clearly separates concerns into three layers:
1. `routes/` (HTTP transport, validation via Zod)
2. `services/` (Business logic orchestrators, e.g., `EngineService.ts`)
3. `repositories/` (Data access, strictly speaking SQL, e.g., `LogRepository.ts`)

**Engineering Impact:**
This explicit separation of concerns means that database changes don't leak into the HTTP layer, and HTTP changes don't leak into business logic.

**Suggested Direction:**
Maintain this architectural boundary. Ensure that no SQL queries ever leak into the `routes/` or `services/` directories.

**Estimated Effort:** Small
**Release Blocker:** No
