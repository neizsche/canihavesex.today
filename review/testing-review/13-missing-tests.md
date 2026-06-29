# Testing & Reliability Review: Missing Tests

## Title: Lack of E2E and Migration Testing

**Severity:** Medium
**Confidence:** Confirmed
**Category:** Missing Test Categories
**Affected Files:** N/A (Missing)

**Evidence:**
There are no tests in the repository utilizing Playwright, Cypress, or Selenium. Furthermore, there is no automated harness to verify that a new database schema migration succeeds against a database seeded with legacy data.

**Reliability Risk:**
1. **Migrations:** A badly written SQL migration could lock tables or drop user data unexpectedly during deployment.
2. **E2E:** Frontend refactoring might accidentally break the API payload structure without failing any TS compilation checks or unit tests.

**Suggested Direction:**
Introduce Playwright for minimal, high-value E2E flows (Login, Log today's data, Logout). Add a CI step that spins up a Postgres container, runs all existing migrations to reach the current schema, and then applies any new migrations to verify they execute without syntax errors.

**Recommended Test Type:** E2E / Integration
**Estimated Effort:** Large
**Release Blocker:** No
