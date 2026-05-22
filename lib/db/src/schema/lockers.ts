import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { clientsTable } from "./clients";
import { rentalSessionsTable } from "./rental_sessions";

export const resourceStatusEnum = pgEnum("resource_status", ["available", "occupied", "reserved", "maintenance"]);

export const lockersTable = pgTable("lockers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  status: resourceStatusEnum("status").notNull().default("available"),
  maintenanceNotes: text("maintenance_notes"),
  // ON DELETE RESTRICT: Prevents client deletion if they have an active locker assignment
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "restrict" }),
  // ON DELETE RESTRICT: Prevents session deletion if a locker references it
  // This ensures rooms/lockers are explicitly released (status set to available, sessionId cleared)
  // before the session can be deleted, preventing orphaned resource states
  sessionId: integer("session_id").references(() => rentalSessionsTable.id, { onDelete: "restrict" }),
  startTime: timestamp("start_time", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const insertLockerSchema = createInsertSchema(lockersTable).omit({ id: true });
export type InsertLocker = z.infer<typeof insertLockerSchema>;
export type Locker = typeof lockersTable.$inferSelect;
