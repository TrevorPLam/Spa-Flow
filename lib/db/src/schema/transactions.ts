import { pgTable, text, serial, integer, numeric, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { clientsTable } from "./clients";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "locker_rental",
  "room_rental",
  "membership",
  "product",
  "renewal",
  "extension",
]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  // ON DELETE CASCADE: When client is deleted, all transactions are automatically deleted
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  squarePaymentId: text("square_payment_id"),
  description: text("description"),
  sessionId: integer("session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for client transaction history queries
  clientCreatedAtIdx: index("idx_transactions_client_created").on(table.clientId, table.createdAt),
  // Index for dashboard recent transactions
  createdAtIdx: index("idx_transactions_created_at").on(table.createdAt),
  // Index on foreign key for cascade delete performance
  clientIdIdx: index("idx_transactions_client_id").on(table.clientId),
}));

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
