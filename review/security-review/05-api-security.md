# Security Review: API Security

## Title: CSRF Protection Relies Exclusively on Custom Headers

**Severity:** Low
**Confidence:** Confirmed
**Category:** API Security
**Affected Files:** `apps/backend/src/index.ts`
**Location:** `app.addHook('preHandler', ...)`

**Evidence:**
```typescript
if (!isAdmin && !isWebhook && !isApiKey && req.headers['x-requested-with'] !== 'XMLHttpRequest') {
  return reply.status(403).send({ error: 'Forbidden', message: 'CSRF validation failed...' });
}
```

**Attack Scenario:**
An attacker tricks a victim into visiting a malicious site that automatically submits a cross-origin POST request to `/api/v1/user/account` (account deletion). 

**Potential Impact:**
Unintended state changes on behalf of the victim.

**Recommended Direction:**
The application relies on checking for the `X-Requested-With` header. Because browsers prevent cross-origin requests from setting custom headers (unless permitted by CORS preflight), this is a known, effective defense for APIs. Additionally, the session cookie uses `SameSite=lax` (or `none` when explicitly configured for split domains). The combination is sufficient. Ensure CORS is strictly bound in production (which it is, via `PUBLIC_APP_BASE`).

**Relevant Standard:**
OWASP Top 10 A01:2021 - CSRF

**Release Blocker:**
No
