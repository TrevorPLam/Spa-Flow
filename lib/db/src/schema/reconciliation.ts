import { pgTable, numeric, timestamp, pgEnum, index, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const reconciliationStatusEnum = pgEnum("reconciliation_status", [
  "matched",
  "discrepancy",
  "pending",
]);

export const reconciliationResultsTable = pgTable("reconciliation_results", {
  id: serial("id").primaryKey(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  totalInternal: numeric("total_internal", { precision: 10, scale: 2 }).notNull(),
  totalSquare: numeric("total_square", { precision: 10, scale: 2 }).notNull(),
  discrepancies: jsonb("discrepancies").notNull().$type<{
    missingInSquare: Array<{ paymentId: string; amount: number }>;
    missingInInternal: Array<{ squarePaymentId: string; amount: number }>;
    amountMismatches: Array<{
      paymentId: string;
      squarePaymentId: string;
      internalAmount: number;
      squareAmount: number;
    }>;
  }>(),
  status: reconciliationStatusEnum("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  dateIdx: index("idx_reconciliation_date").on(table.date),
  statusIdx: index("idx_reconciliation_status").on(table.status),
}));

export const insertReconciliationResultSchema = createInsertSchema(reconciliationResultsTable).omit({ id: true, createdAt: true });
export type InsertReconciliationResult = z.infer<typeof insertReconciliationResultSchema>;
export type ReconciliationResult = typeof reconciliationResultsTable.$inferSelect;
