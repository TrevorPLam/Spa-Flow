import { pgTable, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const membershipTypeEnum = pgEnum("membership_type", ["one_time", "six_month"]);

export const membershipsTable = pgTable("memberships", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id),
  type: membershipTypeEnum("type").notNull(),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  transactionId: integer("transaction_id"),
});

export const insertMembershipSchema = createInsertSchema(membershipsTable).omit({ id: true, purchasedAt: true });
export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type Membership = typeof membershipsTable.$inferSelect;
