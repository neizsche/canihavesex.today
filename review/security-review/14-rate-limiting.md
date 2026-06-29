# Security Review: Rate Limiting

## Title: Strict Authentication Rate Limiting

**Severity:** Low
**Confidence:** Confirmed
**Category:** Rate Limiting & Abuse
**Affected Files:** `apps/backend/src/index.ts`
**Location:** Rate Limiter Middleware configuration

**Evidence:**
```typescript
const authRateLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: process.env.NODE_ENV === 'production' ? 10 : 1000,
});
```

**Attack Scenario:**
An attacker uses a botnet to perform a credential stuffing attack against the `/api/auth/login` endpoint, testing thousands of leaked passwords against a known email.

**Potential Impact:**
Account takeover via brute-force.

**Recommended Direction:**
The current configuration of 10 requests per 15 minutes in production provides exceptionally tight protection against credential stuffing. However, if this relies solely on IP address, users sharing a single IP (e.g., behind a corporate NAT or CGNAT) might accidentally lock each other out of logging in. Verify whether the limiter uses `X-Forwarded-For` effectively or keys off the email address as well. 

**Relevant Standard:**
OWASP ASVS V11.1 Business Logic Security

**Release Blocker:**
No
