import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

// --- Cloud-only email verification: shared config + pure helpers -------------
// This whole feature is a CLOUD-ONLY concern. Self-hosted deployments leave
// REQUIRE_EMAIL_VERIFICATION unset, so `isEmailVerificationEnabled()` is false,
// no Resend client is ever constructed, and signup auto-verifies. The app runs
// with no email credentials configured at all.

/** Length of the numeric verification code shown to the user. */
export const CODE_LENGTH = 6;
/** A code is valid for 10 minutes after it is issued. */
export const CODE_TTL_MS = 10 * 60 * 1000;
/** Wrong attempts allowed against a single code before it is invalidated. */
export const MAX_ATTEMPTS = 5;
/** Minimum gap between "resend code" requests for a given account. */
export const RESEND_COOLDOWN_MS = 45 * 1000;

/**
 * Whether email verification runs in this deployment.
 *
 * Cloud sets `REQUIRE_EMAIL_VERIFICATION=true`; self-hosted leaves it unset.
 * Mirrors the existing env-flag predicates (`isDemoAccountEnabled`, etc.).
 */
export function isEmailVerificationEnabled(): boolean {
  return process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
}

/**
 * A cryptographically-strong, zero-padded 6-digit code (e.g. "004217").
 * `randomInt` is uniform over the range, avoiding modulo bias.
 *
 * The returned raw code is sensitive: it is only ever hashed for storage and
 * handed to the email sender. Never log it.
 */
export function generateCode(): string {
  return randomInt(0, 10 ** CODE_LENGTH)
    .toString()
    .padStart(CODE_LENGTH, '0');
}

/**
 * Keyed (HMAC-SHA256) hash of a code. We store this hash, never the raw code.
 *
 * Keying with the server secret matters here: a 6-digit code has only a million
 * possibilities, so a plain digest would be trivially brute-forced from a DB
 * dump. With HMAC, an attacker also needs the secret (which never leaves the
 * server) to test guesses offline.
 */
export function hashCode(code: string, secret: string): string {
  return createHmac('sha256', secret).update(code).digest('hex');
}

/** Constant-time comparison of a submitted code against a stored hash. */
export function codeMatches(code: string, secret: string, storedHash: string): boolean {
  const computed = Buffer.from(hashCode(code, secret), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  if (computed.length !== stored.length) return false;
  return timingSafeEqual(computed, stored);
}
