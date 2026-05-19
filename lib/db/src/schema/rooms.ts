import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { clientsTable } from "./clients";
import { resourceStatusEnum } from "./lockers";
import { rentalSessionsTable } from "./rental_sessions";

export const roomsTable = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  status: resourceStatusEnum("status").notNull().default("available"),
  // ON DELETE RESTRICT: Prevents client deletion if they have an active room assignment
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "restrict" }),
  // ON DELETE RESTRICT: Prevents session deletion if a room references it
  sessionId: integer("session_id").references(() => rentalSessionsTable.id, { onDelete: "restrict" }),
  startTime: timestamp("start_time", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ id: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;
