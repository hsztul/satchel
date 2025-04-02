import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Function to run migrations
async function runMigrations() {
  // Get database URL from environment variable or use default for development
  const databaseUrl = process.env.DATABASE_URL || 
    'postgresql://neondb_owner:npg_znTIkUKwl80Y@ep-spring-glade-a56h99fk-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';
  
  const sql = neon(databaseUrl);
  
  try {
    // Read the migrations SQL file
    const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements (separated by semicolons)
    const statements = migrationSql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    // Execute each statement
    console.log('Running database migrations...');
    for (const statement of statements) {
      await sql`${statement}`;
      console.log(`Executed: ${statement.substring(0, 50)}...`);
    }
    
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();
