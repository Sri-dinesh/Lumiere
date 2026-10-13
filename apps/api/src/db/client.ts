import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './schema/index.js';
import { env } from '../config/env.js';

neonConfig.webSocketConstructor = ws;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
});

export const db = drizzle({ client: pool, schema });

export type DatabaseClient = typeof db;
export type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
