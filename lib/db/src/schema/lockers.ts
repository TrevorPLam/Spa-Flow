import { pgTable, text, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const resourceStatusEnum = pgEnum("resource_status", ["available", "occupied", "reserved"]);

export const lockersTable = pgTable("lockers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  status: resourceStatusEnum("status").notNull().default("available"),
  clientId: integer("client_id").references(() => clientsTable.id),
  sessionId: integer("session_id"),
  startTime: timestamp("start_time", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const insertLockerSchema = createInsertSchema(lockersTable).omit({ id: true });
export type InsertLocker = z.infer<typeof insertLockerSchema>;
export type Locker = typeof lockersTable.$inferSelect;
