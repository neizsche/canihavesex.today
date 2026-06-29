# Security Review: Logging

## Title: Absence of Body/Parameter Logging Minimizes Exposure

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Logging
**Affected Files:** `apps/backend/src/index.ts`
**Location:** `onRequest` and `onResponse` hooks

**Evidence:**
The application explicitly disables Fastify's default request logging (`disableRequestLogging: true`) and implements custom hooks that log only safe metadata:
```typescript
req.log.info({
  method: req.method,
  url: req.url,
  statusCode: reply.statusCode,
  durationMs,
  userId,
}, 'request completed');
```

**Attack Scenario:**
A developer authenticates to the production log sink (e.g., Google Cloud Logging, DataDog) and browses logs, inadvertently seeing plaintext passwords from login requests or sensitive health markers from PUT requests.

**Potential Impact:**
Violation of user privacy and internal exposure of credentials.

**Recommended Direction:**
Positive finding. The deliberate exclusion of `req.body` and `req.headers.authorization` in the access logs is a critical privacy control. 

**Relevant Standard:**
OWASP ASVS V7.1 Log Content

**Release Blocker:**
No
