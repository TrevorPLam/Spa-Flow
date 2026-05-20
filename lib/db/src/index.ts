import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.resolve(projectRoot, ".env") });

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

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

// Validate database environment variables
const dbEnv = dbEnvSchema.parse(process.env);

export const pool = new Pool({
  connectionString: dbEnv.DATABASE_URL,
  max: dbEnv.DB_POOL_MAX,
  idleTimeoutMillis: dbEnv.DB_POOL_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: dbEnv.DB_POOL_CONNECTION_TIMEOUT_MS,
});

// Set transaction timeout configurations for all connections
// statement_timeout: Limits individual query execution time (30s default)
// lock_timeout: Limits lock acquisition wait time (5s default to prevent lock queue issues)
// idle_in_transaction_session_timeout: Limits idle time within a transaction (60s default to prevent abandoned transactions)
pool.on('connect', (client) => {
  client.query('SET statement_timeout = ' + dbEnv.DB_STATEMENT_TIMEOUT_MS);
  client.query('SET lock_timeout = ' + dbEnv.DB_LOCK_TIMEOUT_MS);
  client.query('SET idle_in_transaction_session_timeout = ' + dbEnv.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS);
});
export const db = drizzle(pool, { schema });

export * from "./schema";
