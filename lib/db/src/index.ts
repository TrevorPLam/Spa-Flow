import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.resolve(projectRoot, ".env") });

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS || '5000', 10),
});

// Set transaction timeout configurations for all connections
// statement_timeout: Limits individual query execution time (30s default)
// lock_timeout: Limits lock acquisition wait time (5s default to prevent lock queue issues)
// idle_in_transaction_session_timeout: Limits idle time within a transaction (60s default to prevent abandoned transactions)
pool.on('connect', (client) => {
  client.query('SET statement_timeout = ' + (parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10)));
  client.query('SET lock_timeout = ' + (parseInt(process.env.DB_LOCK_TIMEOUT_MS || '5000', 10)));
  client.query('SET idle_in_transaction_session_timeout = ' + (parseInt(process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS || '60000', 10)));
});
export const db = drizzle(pool, { schema });

export * from "./schema";
