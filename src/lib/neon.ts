import { neon, neonConfig } from '@neondatabase/serverless';
import { Pool } from 'pg';

// Configure neon
neonConfig.fetchConnectionCache = true;

// For server-side operations (API routes)
export const sql = neon(process.env.DATABASE_URL!);

// For operations that require a connection pool
let pool: Pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return pool;
}

// Helper function to execute a query and return results
export async function query(text: string, params: any[] = []) {
  try {
    // Use the pool for parameterized queries
    const pool = getPool();
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function for transactions
export async function withTransaction(callback: (client: any) => Promise<any>) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Close the pool when the application is shutting down
if (process.env.NODE_ENV !== 'production') {
  process.on('SIGTERM', () => {
    if (pool) {
      pool.end();
    }
  });
}
