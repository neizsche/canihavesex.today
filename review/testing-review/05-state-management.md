# Testing & Reliability Review: State Management

## Title: React Query State Isolation

**Severity:** Informational
**Confidence:** Confirmed
**Category:** State Management
**Affected Files:** `apps/frontend/src/hooks/`

**Evidence:**
The frontend avoids global state managers (like Redux or Zustand) in favor of Server State management via `@tanstack/react-query`. Client state is kept strictly local to components (e.g., `useState` in the log entry form).

**Reliability Risk:**
Mixing server state and client state often causes the UI to desync from the backend. By relying completely on React Query to handle data fetching, caching, and invalidation, the risk of stale state is vastly reduced.

**Suggested Direction:**
Positive finding. Ensure cache invalidation keys (`queryClient.invalidateQueries`) remain strictly consistent so that logging a new cycle immediately updates the "Today" dashboard.

**Recommended Test Type:** Unit
**Estimated Effort:** Small
**Release Blocker:** No
