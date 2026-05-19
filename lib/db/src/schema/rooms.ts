import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { resourceStatusEnum } from "./lockers";

export const roomsTable = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  status: resourceStatusEnum("status").notNull().default("available"),
  clientId: integer("client_id").references(() => clientsTable.id),
  sessionId: integer("session_id"),
  startTime: timestamp("start_time", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ id: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;
