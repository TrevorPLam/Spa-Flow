import { pgTable, serial, integer, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { transactionsTable } from "./transactions";
import { productsTable } from "./products";

export const transactionItemsTable = pgTable("transaction_items", {
  id: serial("id").primaryKey(),
  // ON DELETE CASCADE: When transaction is deleted, all transaction items are automatically deleted
  transactionId: integer("transaction_id").notNull().references(() => transactionsTable.id, { onDelete: "cascade" }),
  // ON DELETE SET NULL: When product is deleted, productId becomes null to preserve transaction item history
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Index for transaction lookups
  transactionIdIdx: index("idx_transaction_items_transaction_id").on(table.transactionId),
  // Index for product analytics queries
  productIdIdx: index("idx_transaction_items_product_id").on(table.productId),
  // Composite index for product sales analytics
  productTransactionIdx: index("idx_transaction_items_product_transaction").on(table.productId, table.transactionId),
}));

export const insertTransactionItemSchema = createInsertSchema(transactionItemsTable).omit({ id: true, createdAt: true });
export type InsertTransactionItem = z.infer<typeof insertTransactionItemSchema>;
export type TransactionItem = typeof transactionItemsTable.$inferSelect;
