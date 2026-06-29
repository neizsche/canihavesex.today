# Testing & Reliability Review: Error Recovery

## Title: Graceful Fallbacks for External Failures

**Severity:** Low
**Confidence:** Confirmed
**Category:** Error Recovery
**Affected Files:** `apps/frontend/src/lib/api.ts` (or equivalent fetch calls)

**Evidence:**
If the backend crashes or the database is unavailable, Fastify returns a 500 error, or the frontend fetch request simply fails (e.g., `Failed to fetch`). The frontend handles this by utilizing `@tanstack/react-query` which provides automatic retries (default 3) and a robust `isError` state.

**Reliability Risk:**
Because `react-query` handles offline states and retries naturally, the user experience degrades gracefully. However, if the user loses connectivity precisely after hitting "Save" on a log entry, the lack of an offline-first mutation queue means that specific data point might be lost.

**Suggested Direction:**
Implement an optimistic update strategy combined with offline mutation queues in `react-query` so that users without cell service can still log their daily metrics without encountering error screens.

**Recommended Test Type:** E2E
**Estimated Effort:** Large
**Release Blocker:** No
