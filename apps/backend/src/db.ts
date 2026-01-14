import pg from 'pg';

export type Db = {
  kind: 'postgres';
  paramStyle: 'postgres';
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  transaction<T>(callback: (txDb: Db) => Promise<T>): Promise<T>;
};

export async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL is required. ' +
      'Expected format: "postgresql://user:pass@host:5432/db"'
    );
  }

  // Validate DATABASE_URL format
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
      throw new Error(`Unsupported DATABASE_URL protocol: ${parsed.protocol}`);
    }
  } catch (err) {
    throw new Error(
      `Invalid DATABASE_URL format. ` +
      `Expected e.g. "postgresql://user:pass@host:5432/db". ` +
      `Received: ${JSON.stringify(url)}`
    );
  }

  // Configure connection pool for production use
  const pool = new pg.Pool({
    connectionString: url,
    // Connection pool settings
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of clients
    min: parseInt(process.env.DB_POOL_MIN || '2'),  // Minimum number of clients
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // Close idle clients after 30 seconds
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'), // Return error after 2 seconds if connection could not be established
    // SSL configuration
    // Supabase requires SSL (even in development)
    // For local PostgreSQL without SSL, set DB_SSL=false
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
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
    await pool.end().catch(() => undefined);
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
    async transaction<T>(callback: (txDb: Db) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const txDb: Db = {
          kind: 'postgres',
          paramStyle: 'postgres',
          async query<R>(sql: string, params: any[] = []) {
            const res = await client.query(sql, params);
            return res.rows as R[];
          },
          async exec(sql: string) {
            await client.query(sql);
          },
          async transaction<R>(cb: (nestedTx: Db) => Promise<R>): Promise<R> {
            // Support nested transactions via SAVEPOINT
            const savepointId = `sp_${Math.random().toString(36).substring(2, 9)}`;
            await client.query(`SAVEPOINT ${savepointId}`);
            try {
              const result = await cb(this);
              await client.query(`RELEASE SAVEPOINT ${savepointId}`);
              return result;
            } catch (err) {
              await client.query(`ROLLBACK TO SAVEPOINT ${savepointId}`);
              throw err;
            }
          }
        };

        const result = await callback(txDb);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  };
}
