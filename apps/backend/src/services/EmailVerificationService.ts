import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  codeMatches,
  generateCode,
  hashCode,
} from '../emailVerification.js';

/** A stored verification code row (only the hash is persisted, never the code). */
export interface StoredCode {
  id: string;
  user_id: string;
  code_hash: string;
  expires_at: string | Date;
  attempts: number;
  consumed_at: string | Date | null;
  created_at: string | Date;
}

/**
 * Persistence contract for the service. The Postgres-backed implementation is
 * `EmailVerificationRepository`; tests inject an in-memory fake. Keeping this an
 * interface is what lets the verification logic be unit-tested without a DB.
 */
export interface VerificationStore {
  createCode(rec: {
    userId: string;
    codeHash: string;
    expiresAt: string;
    createdAt: string;
  }): Promise<void>;
  /** Most recent code for the user that has not been consumed/invalidated. */
  latestActiveCodeForUser(userId: string): Promise<StoredCode | undefined>;
  incrementAttempts(id: string): Promise<void>;
  consumeCode(id: string): Promise<void>;
  setUserVerified(userId: string): Promise<void>;
}

export type SendEmail = (to: string, code: string) => Promise<void>;

/** Verification outcome. Callers map both failure modes to one generic error. */
export type VerifyResult = 'ok' | 'invalid';

export type RequestResult = { sent: true } | { sent: false; cooldownRemainingMs: number };

function toMs(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * Orchestrates issuing and checking email verification codes.
 *
 * The raw code only ever lives in memory here: it is hashed before it touches
 * the store and handed straight to the email sender. It is never logged.
 */
export class EmailVerificationService {
  constructor(
    private readonly store: VerificationStore,
    private readonly sendEmail: SendEmail,
    private readonly secret: string,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /**
   * Issue a fresh code and email it. Enforces a per-account cooldown so the
   * "resend" button can't be used to spam an inbox. Returns `{ sent: false }`
   * (with the remaining cooldown) instead of throwing when on cooldown.
   */
  async requestCode(userId: string, email: string): Promise<RequestResult> {
    const existing = await this.store.latestActiveCodeForUser(userId);
    if (existing) {
      const elapsed = this.now() - toMs(existing.created_at);
      if (elapsed < RESEND_COOLDOWN_MS) {
        return { sent: false, cooldownRemainingMs: RESEND_COOLDOWN_MS - elapsed };
      }
    }

    const code = generateCode();
    const nowMs = this.now();
    // Store the hash first so the code exists even if the email send fails
    // (the user can then use "resend" once delivery is working).
    await this.store.createCode({
      userId,
      codeHash: hashCode(code, this.secret),
      expiresAt: new Date(nowMs + CODE_TTL_MS).toISOString(),
      createdAt: new Date(nowMs).toISOString(),
    });
    await this.sendEmail(email, code);
    return { sent: true };
  }

  /**
   * Check a submitted code for a user. Always resolves to a generic 'ok' /
   * 'invalid' — the route turns any failure into the same opaque error so the
   * response never reveals whether the email exists or why a code failed.
   */
  async verify(userId: string, input: string): Promise<VerifyResult> {
    const code = await this.store.latestActiveCodeForUser(userId);
    if (!code) return 'invalid';

    // Expired or already over the attempt budget → burn it and fail.
    if (this.now() > toMs(code.expires_at)) {
      await this.store.consumeCode(code.id);
      return 'invalid';
    }
    if (code.attempts >= MAX_ATTEMPTS) {
      await this.store.consumeCode(code.id);
      return 'invalid';
    }

    if (codeMatches(input, this.secret, code.code_hash)) {
      await this.store.consumeCode(code.id);
      await this.store.setUserVerified(userId);
      return 'ok';
    }

    // Wrong code: count the attempt and invalidate once the budget is spent.
    await this.store.incrementAttempts(code.id);
    if (code.attempts + 1 >= MAX_ATTEMPTS) {
      await this.store.consumeCode(code.id);
    }
    return 'invalid';
  }
}
