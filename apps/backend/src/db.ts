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
    // Configure connection pool for production use
    const pool = new pg.Pool({
      connectionString: url,
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
      console.error('Failed to initialize PostgreSQL connection pool:', error);
      throw error;
    }

    return {
      kind: 'postgres',
      paramStyle: 'postgres',
      async query<T>(sql: string, params: any[] = []) {
        const client = await pool.connect();
        try {
          const res = await client.query(sql, params);
          return res.rows as T[];
        } catch (error) {
          console.error('Database query error:', { sql, params, error });
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
