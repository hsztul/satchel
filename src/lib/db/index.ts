import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

neonConfig.fetchConnectionCache = true;

// We'll use env variables in production, but for development we'll use the connection string
const sql = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL)
  : neon('postgresql://neondb_owner:npg_znTIkUKwl80Y@ep-spring-glade-a56h99fk-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require');

export const db = drizzle(sql);
