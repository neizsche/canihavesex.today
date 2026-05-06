import type { Db } from '../db.js';

export interface ApiKeyRecord {
  id: string; // UUID
  user_id: string; // UUID
  name: string | null;
  key_hash: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function normalizeTimestamp(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export class ApiKeyRepository {
  constructor(private db: Db) { }

  async create(key: {
    id: string;
    user_id: string;
    name: string | null;
    key_hash: string;
    key_prefix: string;
    created_at?: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO user_api_keys (id, user_id, name, key_hash, key_prefix, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [key.id, key.user_id, key.name, key.key_hash, key.key_prefix, key.created_at || new Date().toISOString()]
    );
  }

  async listByUserId(userId: string): Promise<ApiKeyRecord[]> {
    const rows = await this.db.query<any>(
      `SELECT * FROM user_api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows.map((row) => ({
      ...row,
      created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
      last_used_at: normalizeTimestamp(row.last_used_at),
      revoked_at: normalizeTimestamp(row.revoked_at),
    })) as ApiKeyRecord[];
  }

  async findActiveByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const rows = await this.db.query<any>(
      `SELECT * FROM user_api_keys WHERE key_hash = $1 AND revoked_at IS NULL LIMIT 1`,
      [keyHash]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      created_at: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
      last_used_at: normalizeTimestamp(row.last_used_at),
      revoked_at: normalizeTimestamp(row.revoked_at),
    } as ApiKeyRecord;
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.db.query(`UPDATE user_api_keys SET last_used_at = NOW() WHERE id = $1`, [id]);
  }

  async revokeById(userId: string, id: string): Promise<void> {
    await this.db.query(
      `UPDATE user_api_keys SET revoked_at = NOW() WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE user_api_keys SET revoked_at = NOW() WHERE user_id = $2 AND revoked_at IS NULL`,
      [userId]
    );
  }
}
