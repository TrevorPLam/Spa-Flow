import { pgTable, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { clientsTable } from "./clients";
import { transactionsTable } from "./transactions";

export const membershipTypeEnum = pgEnum("membership_type", ["one_time", "six_month"]);

export const membershipsTable = pgTable("memberships", {
  id: serial("id").primaryKey(),
  // ON DELETE CASCADE: When client is deleted, all memberships are automatically deleted
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  type: membershipTypeEnum("type").notNull(),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  // ON DELETE SET NULL: When transaction is deleted, membership.transactionId is set to NULL
  transactionId: integer("transaction_id").references(() => transactionsTable.id, { onDelete: "set null" }),
});

export const insertMembershipSchema = createInsertSchema(membershipsTable).omit({ id: true, purchasedAt: true });
export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type Membership = typeof membershipsTable.$inferSelect;
