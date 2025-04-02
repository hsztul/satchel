import { sql, getPool } from './neon';
import fs from 'fs';
import path from 'path';

/**
 * Initialize the database by running the SQL schema
 */
export async function initDatabase() {
  console.log('Initializing database...');
  
  try {
    // Read the schema SQL file
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    
    // Execute the schema SQL using the Pool for transaction support
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await client.query(schemaSql);
      await client.query('COMMIT');
      console.log('Database initialized successfully');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to initialize database:', error);
      return false;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

// Function to check if the database is initialized
export async function isDatabaseInitialized() {
  try {
    // Check if the entry table exists
    const result = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'entry'
      );
    `;
    
    return result[0]?.exists || false;
  } catch (error) {
    console.error('Error checking database initialization:', error);
    return false;
  }
}

// This can be imported and called in the app's startup
export async function ensureDatabaseInitialized() {
  const isInitialized = await isDatabaseInitialized();
  
  if (!isInitialized) {
    return await initDatabase();
  }
  
  console.log('Database already initialized');
  return true;
}
