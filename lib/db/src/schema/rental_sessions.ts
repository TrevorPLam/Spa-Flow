import { pgTable, serial, integer, numeric, timestamp, pgEnum, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const resourceTypeEnum = pgEnum("resource_type", ["locker", "room"]);
export const sessionStatusEnum = pgEnum("session_status", ["active", "completed", "expired"]);

export const rentalSessionsTable = pgTable("rental_sessions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id),
  resourceType: resourceTypeEnum("resource_type").notNull(),
  resourceId: integer("resource_id").notNull(),
  resourceName: text("resource_name").notNull(),
  status: sessionStatusEnum("status").notNull().default("active"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRentalSessionSchema = createInsertSchema(rentalSessionsTable).omit({ id: true, createdAt: true });
export type InsertRentalSession = z.infer<typeof insertRentalSessionSchema>;
export type RentalSession = typeof rentalSessionsTable.$inferSelect;
