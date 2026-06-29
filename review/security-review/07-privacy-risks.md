# Security Review: Privacy Risks

## Title: Excellent Telemetry & PII Suppression

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Privacy
**Affected Files:** `apps/backend/src/db.ts`, `apps/backend/src/index.ts`
**Location:** Global Logging Configurations

**Evidence:**
The database query execution intentionally suppresses parameters in exception logs to prevent logging PII.
```typescript
} catch (error) {
  // Avoid logging params: they may contain sensitive user data.
  console.error('Database query error:', { sql, error });
  throw error;
}
```
Furthermore, the application completely lacks third-party analytics scripts or ad-trackers, aligning tightly with the project's stated privacy-first design.

**Attack Scenario:**
A developer checks system logs in their cloud provider's logging console and inadvertently reads a user's logged symptoms, weight, or cycle status.

**Potential Impact:**
Accidental exposure of sensitive health information in internal logs.

**Recommended Direction:**
Positive finding. The suppression of SQL parameters ensures that any database exceptions will not spill fertility data into `stdout` or log aggregators.

**Relevant Standard:**
OWASP ASVS V8.1 General Data Protection

**Release Blocker:**
No
