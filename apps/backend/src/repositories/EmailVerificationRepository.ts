import { randomUUID } from 'node:crypto';
import type { Db } from '../db.js';
import type { StoredCode, VerificationStore } from '../services/EmailVerificationService.js';

/**
 * Postgres-backed store for email verification codes (see migration v4).
 * Only the HMAC hash of a code is ever written here — never the raw code.
 */
export class EmailVerificationRepository implements VerificationStore {
  constructor(private db: Db) {}

  async createCode(rec: {
    userId: string;
    codeHash: string;
    expiresAt: string;
    createdAt: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO email_verification_codes (id, user_id, code_hash, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), rec.userId, rec.codeHash, rec.expiresAt, rec.createdAt],
    );
  }

  async latestActiveCodeForUser(userId: string): Promise<StoredCode | undefined> {
    const rows = await this.db.query<StoredCode>(
      `SELECT * FROM email_verification_codes
       WHERE user_id = $1 AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId],
    );
    return rows[0];
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.db.query(
      `UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1`,
      [id],
    );
  }

  async consumeCode(id: string): Promise<void> {
    await this.db.query(
      `UPDATE email_verification_codes SET consumed_at = NOW() WHERE id = $1`,
      [id],
    );
  }

  async setUserVerified(userId: string): Promise<void> {
    await this.db.query(`UPDATE users SET email_verified = true WHERE id = $1`, [userId]);
  }
}
