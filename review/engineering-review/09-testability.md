# Engineering Review: Testability

## Title: Missing End-to-End Test Suite

**Severity:** Medium
**Confidence:** Confirmed
**Category:** Testability
**Affected Files:** Repository Root

**Evidence:**
There are solid unit tests for the core engine logic (`engine.test.ts`, `patterns.test.ts`), but there are no Playwright or Cypress tests verifying the frontend-backend integration.

**Engineering Impact:**
Without E2E tests, the team cannot be certain that the user's critical path (login, log a temperature, view cycle prediction) functions correctly in an actual browser environment. Refactoring the frontend runs the risk of silently breaking core behaviors.

**Suggested Direction:**
Implement Playwright for end-to-end testing. Start with a single "smoke test" that seeds the DB, logs a user in, and verifies the "Today" dashboard renders accurately.

**Estimated Effort:** Medium
**Release Blocker:** No
