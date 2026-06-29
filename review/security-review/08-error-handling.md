# Security Review: Error Handling

## Title: Safe Generic Error Bubbling

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Error Handling
**Affected Files:** `apps/backend/src/index.ts`
**Location:** Fastify Error Handler

**Evidence:**
```typescript
return reply.status(statusCode).send({
  error: statusCode === 400 ? 'Bad Request' : statusCode === 401 || statusCode === 403 ? 'Unauthorized' : 'Internal Server Error',
  message: process.env.NODE_ENV === 'production' && statusCode >= 500 ? 'An internal server error occurred' : error.message,
});
```

**Attack Scenario:**
An attacker sends malformed input that causes a backend exception. The server returns a stack trace revealing directory paths, framework versions, or database schema details.

**Potential Impact:**
Information Disclosure.

**Recommended Direction:**
Positive finding. The global error handler correctly squashes 500-level error messages in production environments, replacing them with generic placeholders, while allowing `zod` validation errors to pass through safely.

**Relevant Standard:**
OWASP ASVS V7.4 Error Handling

**Release Blocker:**
No
