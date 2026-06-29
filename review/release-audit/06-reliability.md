# Release Audit: Reliability

## Title: Lacking Automated E2E Coverage

**Severity:** Low
**Confidence:** Confirmed
**Category:** Reliability
**Affected Files:** Missing End-to-End test suite.
**Evidence:** 
There are extensive unit tests for the core fertility engine (`engine.test.ts`), but no integration tests (Playwright/Cypress) covering the frontend-backend integration.

**Impact:**
While the math is mathematically proven by unit tests, a UI refactor could accidentally break the data entry flow, preventing users from logging their temperatures or symptoms. 

**Recommended Direction:**
Implement a basic Playwright test suite covering the "Happy Path" (Login -> Enter Data -> Verify Prediction) shortly after launch. 

**Estimated Fix Time:** 2-3 Days
**Release Blocker:** No
