import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.resolve(projectRoot, '.env') });

// Database environment schema for validation
const dbEnvSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  DB_POOL_MAX: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1).max(100)).default(20),
  DB_POOL_IDLE_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1000)).default(30000),
  DB_POOL_CONNECTION_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1000)).default(5000),
  DB_STATEMENT_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1000)).default(30000),
  DB_LOCK_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1000)).default(5000),
  DB_IDLE_IN_TRANSACTION_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().min(1000)).default(60000),
});

export type DbEnv = z.infer<typeof dbEnvSchema>;

let validatedDbEnv: DbEnv | null = null;

export function validateDbEnv(): DbEnv {
  if (validatedDbEnv) {
    return validatedDbEnv;
  }

  const result = dbEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Database environment validation failed:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    console.error('\nDatabase will not initialize without valid environment variables.');
    throw new Error('Database environment validation failed');
  }

  console.log('✅ Database environment validation passed');
  validatedDbEnv = result.data;
  return validatedDbEnv;
}

export function getDbEnv(): DbEnv {
  if (!validatedDbEnv) {
    return validateDbEnv();
  }
  return validatedDbEnv;
}

// Helper function to get database configuration
export function getDatabaseConfig() {
  const env = getDbEnv();
  return {
    connectionString: env.DATABASE_URL,
    pool: {
      max: env.DB_POOL_MAX,
      idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: env.DB_POOL_CONNECTION_TIMEOUT_MS,
    },
    timeouts: {
      statementTimeout: env.DB_STATEMENT_TIMEOUT_MS,
      lockTimeout: env.DB_LOCK_TIMEOUT_MS,
      idleInTransactionSessionTimeout: env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS,
    },
  };
}

// Reset cached environment for test isolation
export function resetDbEnv(): void {
  validatedDbEnv = null;
}
