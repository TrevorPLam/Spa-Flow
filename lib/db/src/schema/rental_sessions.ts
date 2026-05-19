import { pgTable, serial, integer, numeric, timestamp, pgEnum, text, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { clientsTable } from "./clients";

export const resourceTypeEnum = pgEnum("resource_type", ["locker", "room"]);
export const sessionStatusEnum = pgEnum("session_status", ["active", "completed", "expired"]);

export const rentalSessionsTable = pgTable("rental_sessions", {
  id: serial("id").primaryKey(),
  // ON DELETE CASCADE: When client is deleted, all rental sessions are automatically deleted
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  resourceType: resourceTypeEnum("resource_type").notNull(),
  resourceId: integer("resource_id").notNull(),
  resourceName: text("resource_name").notNull(),
  status: sessionStatusEnum("status").notNull().default("active"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for active session queries by client
  clientStatusIdx: index("idx_rental_sessions_client_status").on(table.clientId, table.status),
  // Composite index for resource lookup
  resourceIdx: index("idx_rental_sessions_resource").on(table.resourceType, table.resourceId, table.status),
  // Index on foreign key for cascade delete performance
  clientIdIdx: index("idx_rental_sessions_client_id").on(table.clientId),
  // Index on status for filtering active sessions
  statusIdx: index("idx_rental_sessions_status").on(table.status),
}));

export const insertRentalSessionSchema = createInsertSchema(rentalSessionsTable).omit({ id: true, createdAt: true });
export type InsertRentalSession = z.infer<typeof insertRentalSessionSchema>;
export type RentalSession = typeof rentalSessionsTable.$inferSelect;
