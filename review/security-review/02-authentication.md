# Security Review: Authentication

## Title: Stateless Session Implementation Prevents Active Revocation

**Severity:** High
**Confidence:** Confirmed
**Category:** Authentication
**Affected Files:** `apps/backend/src/auth.ts`, `apps/backend/src/plugins/auth.ts`, `apps/backend/src/routes/auth.ts`
**Location:** `setSessionCookie` and `/api/signout`

**Evidence:**
The application issues a signed cookie storing only the user's UUID:
```typescript
export function setSessionCookie(reply: any, userId: string): void {
  reply.setCookie('uid', userId, { ...sessionCookieOptions(), signed: true, maxAge: 30 * 24 * 60 * 60 });
}
```
Logging out (`POST /api/signout`) only issues a `clearCookie` instruction to the browser. If an attacker intercepts the cookie, they can replay it for up to 30 days. The server's auth hook (`plugins/auth.ts`) only checks if the user exists in the DB (`userRepository.findById(uid)`), not if the specific session is valid.

**Attack Scenario:**
An attacker extracts the signed `uid` cookie from a victim's browser via malware or physical access. The victim clicks "Sign Out". The attacker continues to use the stolen cookie because the backend has no blacklist or session table to check if that specific login instance was revoked.

**Potential Impact:**
Long-lived, unrevocable account takeover (up to 30 days).

**Recommended Direction:**
Migrate to stateful sessions. Create a `sessions` table in Postgres (storing `session_id`, `user_id`, `expires_at`). Store the `session_id` in the signed cookie instead of the raw `user_id`. When a user logs out, delete the session from the database.

**Relevant Standard:**
OWASP Top 10 A07:2021 - Identification and Authentication Failures; OWASP ASVS V3.3 Session Management

**Release Blocker:**
No (Assuming the threat model accepts device-level compromise as game over for a V1 self-hosted app).
