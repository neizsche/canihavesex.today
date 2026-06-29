# Engineering Review: API & Internal Contracts

## Title: Missing Centralized Frontend API Client

**Severity:** Low
**Confidence:** Confirmed
**Category:** Contracts
**Affected Files:** `apps/frontend/src/`

**Evidence:**
The frontend relies heavily on direct `fetch('/api/v1/...')` calls inside `react-query` hooks or React components. 

**Engineering Impact:**
If the backend changes a route URL or response schema, the TypeScript compiler will not catch the mismatch in the frontend because the `fetch` responses are manually cast or assumed to be correct.

**Suggested Direction:**
Introduce a centralized API client layer (e.g., using `openapi-fetch` or `ts-rest` or even a manual `api.ts` file) that shares type definitions with the backend's Zod schemas. This ensures end-to-end type safety across the network boundary.

**Estimated Effort:** Medium
**Release Blocker:** No
