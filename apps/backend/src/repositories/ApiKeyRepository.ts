import type { Db } from '../db.js';

export interface ApiKeyRecord {
  id: string;
  user_id: string;
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
    created_at: string;
  }): Promise<void> {
    await this.db.query(
      `insert into user_api_keys (id, user_id, name, key_hash, key_prefix, created_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [key.id, key.user_id, key.name, key.key_hash, key.key_prefix, key.created_at]
    );
  }

  async listByUserId(userId: string): Promise<ApiKeyRecord[]> {
    const rows = await this.db.query<any>(
      `select * from user_api_keys where user_id = $1 order by created_at desc`,
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
      `select * from user_api_keys where key_hash = $1 and revoked_at is null limit 1`,
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
    const now = new Date().toISOString();
    await this.db.query(`update user_api_keys set last_used_at = $1 where id = $2`, [now, id]);
  }

  async revokeById(userId: string, id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.query(
      `update user_api_keys set revoked_at = $1 where id = $2 and user_id = $3`,
      [now, id, userId]
    );
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.query(
      `update user_api_keys set revoked_at = $1 where user_id = $2 and revoked_at is null`,
      [now, userId]
    );
  }
}
