# Testing & Reliability Review: Testing Strategy

## Title: Concentrated Unit Testing on Domain Logic

**Severity:** Informational
**Confidence:** High
**Category:** Testing Strategy
**Affected Files:** `apps/backend/tests/engine.test.ts`, `apps/frontend/src/lib/date.test.ts`

**Evidence:**
The testing strategy heavily favors pure unit tests for complex domain logic over broad integration tests. For example, `engine.test.ts` runs thousands of assertions against simulated cycle patterns, and `logState.test.ts` verifies React hook state transitions for the logging form. 

**Reliability Risk:**
Because there are no End-to-End (E2E) tests, it is possible for the `engine.ts` to output perfect data that the frontend misinterprets or fails to render due to a typo in a component.

**Suggested Direction:**
The current strategy is highly pragmatic for a small team—test the complex math thoroughly. To round out the strategy, introduce a single Playwright "smoke test" that boots the database, runs the backend, serves the frontend, logs a user in, and verifies the dashboard renders.

**Recommended Test Type:** E2E
**Estimated Effort:** Medium
**Release Blocker:** No
