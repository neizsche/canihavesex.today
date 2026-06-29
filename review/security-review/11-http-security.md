# Security Review: HTTP Security

## Title: Comprehensive Security Headers Configured

**Severity:** Informational
**Confidence:** Confirmed
**Category:** HTTP Security
**Affected Files:** `apps/backend/src/index.ts`
**Location:** Global PreHandler Hook

**Evidence:**
```typescript
reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
reply.header('X-Content-Type-Options', 'nosniff');
reply.header('X-Frame-Options', 'DENY');
reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
```

**Attack Scenario:**
An attacker attempts Clickjacking by framing the application on a malicious domain, or tries to abuse browser MIME-sniffing to execute XSS.

**Potential Impact:**
Client-side exploitation including XSS or unintended user actions.

**Recommended Direction:**
Positive finding. The headers applied represent modern best practices. The addition of a strict `Permissions-Policy` disabling hardware sensors aligns well with the privacy-first stance. 
*Safe to Defer:* Add a strict `Content-Security-Policy` (CSP) header.

**Relevant Standard:**
OWASP ASVS V14.4 HTTP Security Headers

**Release Blocker:**
No
