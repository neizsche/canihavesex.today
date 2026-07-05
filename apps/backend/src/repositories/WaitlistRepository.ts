import type { Db } from '../db.js';

/**
 * Postgres-backed store for the pre-launch email waitlist (see baseline
 * migration: table `waitlist`). Capture-only for now — the list is broadcast to
 * at launch via Resend. Emails are stored lower-cased/trimmed by the caller so
 * the table's UNIQUE(email) acts case-insensitively.
 */
export class WaitlistRepository {
  constructor(private db: Db) {}

  /**
   * Add an email to the waitlist. Idempotent: a repeat signup is a no-op (never
   * errors, never reveals that the address already existed — the route returns
   * 200 either way, so signups can't be enumerated).
   */
  async add(rec: { email: string; source?: string | null; reason?: string | null }): Promise<void> {
    await this.db.query(
      `INSERT INTO waitlist (email, source, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [rec.email, rec.source ?? null, rec.reason ?? null]
    );
  }
}
