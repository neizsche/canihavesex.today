# Engineering Review: Error Handling

## Title: Safe but Generic Error Bubbling

**Severity:** Low
**Confidence:** Confirmed
**Category:** Error Handling
**Affected Files:** `apps/backend/src/index.ts`

**Evidence:**
Fastify's `setErrorHandler` squashes most non-validation errors into a generic `500 Internal Server Error` in production. While highly secure, it means the frontend receives opaque failures if a business rule is violated (e.g., trying to log a future date if not caught by Zod).

**Engineering Impact:**
Frontend developers must rely on HTTP 400 responses from Zod for validation, but specific domain logic failures (e.g. "Action not permitted in this cycle phase") might bubble up as 500s or vague 400s if a custom error class is not used.

**Suggested Direction:**
Introduce a custom `DomainError` class (extending `Error`) that includes an explicit `statusCode` and an application-specific `errorCode` (e.g., `CYCLE_OVERLAP`). The global error handler can intercept `DomainError` and safely pass the structured code to the frontend while suppressing raw stack traces.

**Estimated Effort:** Medium
**Release Blocker:** No
