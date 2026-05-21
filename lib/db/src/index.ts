import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { getDatabaseConfig } from "./env";

const { Pool } = pg;

const dbConfig = getDatabaseConfig();

export const pool = new Pool({
  connectionString: dbConfig.connectionString,
  max: dbConfig.pool.max,
  idleTimeoutMillis: dbConfig.pool.idleTimeoutMillis,
  connectionTimeoutMillis: dbConfig.pool.connectionTimeoutMillis,
});

// Set transaction timeout configurations for all connections
// statement_timeout: Limits individual query execution time (30s default)
// lock_timeout: Limits lock acquisition wait time (5s default to prevent lock queue issues)
// idle_in_transaction_session_timeout: Limits idle time within a transaction (60s default to prevent abandoned transactions)
pool.on('connect', (client) => {
  client.query('SET statement_timeout = ' + dbConfig.timeouts.statementTimeout);
  client.query('SET lock_timeout = ' + dbConfig.timeouts.lockTimeout);
  client.query('SET idle_in_transaction_session_timeout = ' + dbConfig.timeouts.idleInTransactionSessionTimeout);
});
export const db = drizzle(pool, { schema });

export * from "./schema";
