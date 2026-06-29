# Privacy Review: Logging

## Title: Strict Parameter Suppression Prevents PII Leakage

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Logging
**Affected Files:** `apps/backend/src/db.ts`, `apps/backend/src/index.ts`

**Evidence:**
The global error handler and database wrapper explicitly strip parameters from the query logs:
```typescript
catch (error) {
  // Avoid logging params: they may contain sensitive user data.
  console.error('Database query error:', { sql, error });
  throw error;
}
```
Fastify's default verbose request logging is also disabled, and replaced with a custom logger that only captures the Method, URL, StatusCode, Duration, and User ID.

**Privacy Risk:**
Web frameworks often blindly log the full HTTP request body or SQL statements on failure, which in a fertility app means streaming plaintext health data (like mucus or bleeding indicators) into centralized log storage.

**Potential User Impact:**
Internal data leakage of health records to IT or DevOps staff.

**Suggested Direction:**
Positive finding. The deliberate masking of these fields is a crucial defense-in-depth measure. 

**Release Blocker:**
No
