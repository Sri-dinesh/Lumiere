import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_MIGRATION_URL: z.string().optional(),
  TEST_DATABASE_URL: z.string().optional(),
  PUBLIC_WEB_ORIGIN: z.string().default('http://localhost:5173'),
  CINEMA_TIMEZONE: z.string().default('Asia/Kolkata'),
  SESSION_TTL_SECONDS: z.coerce.number().default(604800), // 7 days
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@example.test'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('AdminSecret123!'),
  SEED_CUSTOMER_EMAIL: z.string().email().default('customer@example.test'),
  SEED_CUSTOMER_PASSWORD: z.string().min(8).default('CustomerSecret123!'),
  SEED_CUSTOMER_2_EMAIL: z.string().email().default('customer2@example.test'),
  SEED_CUSTOMER_2_PASSWORD: z.string().min(8).default('Customer2Secret123!'),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

export function getEnv(): Env {
  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Invalid environment variables:', result.error.format());
      throw new Error('Invalid environment configuration');
    }
    parsedEnv = result.data;
  }
  return parsedEnv;
}

export const env = getEnv();
