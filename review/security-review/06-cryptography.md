# Security Review: Cryptography

## Title: Robust Native Scrypt Implementation

**Severity:** Informational
**Confidence:** Confirmed
**Category:** Cryptography
**Affected Files:** `apps/backend/src/password.ts`
**Location:** `hashPassword` and `verifyPassword`

**Evidence:**
```typescript
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  ...
}
```
Verification utilizes `timingSafeEqual` to prevent timing attacks.

**Attack Scenario:**
An attacker dumps the Postgres database and attempts to crack passwords using rainbow tables or brute force. 

**Potential Impact:**
Compromise of user accounts.

**Recommended Direction:**
Positive finding. Using the natively built `scrypt` from Node's `crypto` module provides memory-hard hashing without relying on third-party native compilation (like `bcrypt` packages), which is ideal for a self-hosted environment. The use of a 16-byte random salt and `timingSafeEqual` aligns perfectly with modern cryptographic standards.

**Relevant Standard:**
OWASP ASVS V2.4 Password Security

**Release Blocker:**
No
