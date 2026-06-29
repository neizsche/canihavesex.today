# Security Review: Authorization

## Title: Secure Object-Level Authorization (No IDORs Detected)

**Severity:** Informational
**Confidence:** High
**Category:** Authorization
**Affected Files:** `apps/backend/src/routes/`
**Location:** All protected endpoints

**Evidence:**
Across all authenticated routes (e.g., `logs.ts`, `user.ts`, `export.ts`), the data access layer retrieves the target user strictly from the verified session context (`req.userId`), rather than from client-supplied parameters in the URL or Body:
```typescript
app.get('/api/v1/user/export', async (req, reply) => {
  const userId = req.userId!;
  const logs = await logRepo.getAllLogs(userId);
  ...
});
```

**Attack Scenario:**
An attacker alters a user ID parameter (e.g., `?userId=12345`) to access another user's health logs (Insecure Direct Object Reference).

**Potential Impact:**
Unauthorized disclosure of highly sensitive personal health data.

**Recommended Direction:**
This is a positive finding. Continue enforcing the pattern where the `req.userId` implicitly scopes all repository database queries.

**Relevant Standard:**
OWASP Top 10 A01:2021 - Broken Access Control

**Release Blocker:**
No
