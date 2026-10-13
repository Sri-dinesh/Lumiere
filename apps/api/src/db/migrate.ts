import path from 'path';
import { fileURLToPath } from 'url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

neonConfig.webSocketConstructor = ws;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const connectionString = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Neither DATABASE_MIGRATION_URL nor DATABASE_URL is set.');
    process.exit(1);
  }

  console.info('🔄 Running database migrations on Neon...');

  const pool = new Pool({
    connectionString,
    max: 1,
  });

  const db = drizzle(pool);

  try {
    const migrationsFolder = path.resolve(__dirname, '../../drizzle');
    await migrate(db, { migrationsFolder });
    console.info('✅ Database migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
