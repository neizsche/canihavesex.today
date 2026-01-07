import Database from 'better-sqlite3';
import pg from 'pg';

export type Db = {
  kind: 'sqlite' | 'postgres';
  paramStyle: 'postgres' | 'sqlite';
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
};

export async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith('postgres')) {
    const pool = new pg.Pool({ connectionString: url });

    return {
      kind: 'postgres',
      paramStyle: 'postgres',
      async query<T>(sql: string, params: any[] = []) {
        const res = await pool.query(sql, params);
        return res.rows as T[];
      },
      async exec(sql: string) {
        await pool.query(sql);
      },
    };
  }

  const filename = process.env.SQLITE_PATH ?? 'dev.db';
  const db = new Database(filename);

  return {
    kind: 'sqlite',
    paramStyle: 'sqlite',
    async query<T>(sql: string, params: any[] = []) {
      const stmt = db.prepare(sql);
      const isSelect = /^\s*(select|with|pragma)\b/i.test(sql);
      if (isSelect) {
        const rows = stmt.all(...params);
        return rows as T[];
      }

      stmt.run(...params);
      return [] as T[];
    },
    async exec(sql: string) {
      db.exec(sql);
    },
  };
}
