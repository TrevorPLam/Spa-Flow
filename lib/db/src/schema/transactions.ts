import { pgTable, text, serial, integer, numeric, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { clientsTable } from "./clients";
import { rentalSessionsTable } from "./rental_sessions";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "locker_rental",
  "room_rental",
  "membership",
  "product",
  "renewal",
  "extension",
  "refund",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
  "refunded",
]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  // ON DELETE CASCADE: When client is deleted, all transactions are automatically deleted
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  squarePaymentId: text("square_payment_id"),
  description: text("description"),
  // ON DELETE SET NULL: When rental session is deleted, sessionId becomes null to preserve transaction history
  sessionId: integer("session_id").references(() => rentalSessionsTable.id, { onDelete: "set null" }),
  // Reference to original transaction for refunds
  originalTransactionId: integer("original_transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for client transaction history queries
  clientCreatedAtIdx: index("idx_transactions_client_created").on(table.clientId, table.createdAt),
  // Index for dashboard recent transactions
  createdAtIdx: index("idx_transactions_created_at").on(table.createdAt),
  // Index on foreign key for cascade delete performance
  clientIdIdx: index("idx_transactions_client_id").on(table.clientId),
  // Index for status queries
  statusIdx: index("idx_transactions_status").on(table.status),
  // Index for refund lookups
  originalTransactionIdx: index("idx_transactions_original_transaction").on(table.originalTransactionId),
}));

// Add self-referencing foreign key constraint separately
// This avoids TypeScript circular reference issues
export const transactionsTableSelfRef = {
  originalTransactionId: {
    references: () => transactionsTable.id,
    onDelete: "set null",
  },
};

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
