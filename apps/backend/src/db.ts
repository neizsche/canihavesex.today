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
  let usePostgres = !!url && url.startsWith('postgres');
  if (usePostgres && url) {
    // Guard against partial / malformed DATABASE_URL values like "postgres"
    // which can crash pg's connection-string parser.
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
        throw new Error(`Unsupported DATABASE_URL protocol: ${parsed.protocol}`);
      }
    } catch (err) {
      const msg =
        `Ignoring invalid DATABASE_URL (falling back to SQLite). ` +
        `Expected e.g. "postgresql://user:pass@host:5432/db". ` +
        `Received: ${JSON.stringify(url)}`;

      if (process.env.NODE_ENV === 'production') {
        throw new Error(msg);
      }

      console.warn(msg, err);
      usePostgres = false;
    }
  }

  if (usePostgres) {
    // Configure connection pool for production use
    const pool = new pg.Pool({
      connectionString: url!,
      // Connection pool settings
      max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of clients
      min: parseInt(process.env.DB_POOL_MIN || '2'),  // Minimum number of clients
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // Close idle clients after 30 seconds
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'), // Return error after 2 seconds if connection could not be established
      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Handle pool errors
    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
    });

    pool.on('connect', (client) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('New client connected to PostgreSQL');
      }
    });

    // Test the connection
    try {
      const testClient = await pool.connect();
      await testClient.query('SELECT 1');
      testClient.release();
      console.log('PostgreSQL connection pool initialized successfully');
    } catch (error) {
      // In dev, prefer falling back to SQLite so "npm run dev" works out of the box
      // even when DATABASE_URL is set but Postgres isn't running.
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          'PostgreSQL connection failed in development; falling back to SQLite. ' +
            'DATABASE_URL is set in your environment (shell/.env). To use SQLite, unset DATABASE_URL; to use Postgres, start Postgres.',
          error
        );
        await pool.end().catch(() => undefined);
        usePostgres = false;
      } else {
        console.error('Failed to initialize PostgreSQL connection pool:', error);
        throw error;
      }
    }

    if (usePostgres) {
      return {
      kind: 'postgres',
      paramStyle: 'postgres',
      async query<T>(sql: string, params: any[] = []) {
        const client = await pool.connect();
        try {
          const res = await client.query(sql, params);
          return res.rows as T[];
        } catch (error) {
          // Avoid logging params: they may contain sensitive user data.
          console.error('Database query error:', { sql, error });
          throw error;
        } finally {
          client.release();
        }
      },
      async exec(sql: string) {
        const client = await pool.connect();
        try {
          await client.query(sql);
        } catch (error) {
          console.error('Database exec error:', { sql, error });
          throw error;
        } finally {
          client.release();
        }
      },
      };
    }
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
