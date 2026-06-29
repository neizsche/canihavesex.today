# Security Review: Secrets Management

## Title: Secure Environment Variable Enforcement

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Secrets Management
**Affected Files:** `apps/backend/src/index.ts`
**Location:** Startup Boot Sequence

**Evidence:**
```typescript
const cookieSecret = process.env.COOKIE_SECRET ?? '';
if (cookieSecret.length < 32 || cookieSecret.includes('CHANGE_ME')) {
  console.error('COOKIE_SECRET is too short or still the placeholder...');
  process.exit(1);
}
```

**Attack Scenario:**
In many self-hosted applications, administrators deploy using `.env.example` defaults, leaving cryptographic keys as "CHANGE_ME". An attacker exploits this known secret to forge signed session cookies.

**Potential Impact:**
Full account takeover if the secret is guessable or default.

**Recommended Direction:**
This is a positive finding. The explicit crash on weak secrets is a highly mature defense mechanism and should be maintained.

**Relevant Standard:**
OWASP ASVS V1.6 Cryptographic Architecture

**Release Blocker:**
No
