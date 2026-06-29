# Phase 1 Inspection: API Design

## Title: Missing Pagination on Bulk API Endpoints

**Severity:** Low
**Confidence:** Likely

**Files:** `apps/backend/src/routes/logs.ts`, `apps/backend/src/routes/calendar.ts`
**Location:** General API Definitions

**Problem:** 
It appears that endpoints intended to fetch historical data might lack explicit pagination controls, or at least they aren't prominently documented.

**Evidence:** 
When fetching logs or calendar items, returning an unbounded array of data can eventually become a performance bottleneck for users who have been tracking their cycles for many years.

**Why it matters:** 
Backend engineers reviewing the REST API boundaries will specifically look for how data scales over time. Returning thousands of daily logs in a single JSON payload without cursors or limits is an anti-pattern that signals the system hasn't fully planned for long-term power users.

**Suggested direction:** 
Ensure that endpoints that return arrays (like historical logs or cycle summaries) support limit/offset or cursor-based pagination, or explicitly document that the data is partitioned by year/cycle.

**Should this block the public release?** 
No
