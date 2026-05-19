import { pgTable, serial, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { clientsTable } from "./clients";

export const waitlistStatusEnum = pgEnum("waitlist_status", ["waiting", "assigned", "confirmed", "expired"]);

export const waitlistTable = pgTable("waitlist_entries", {
  id: serial("id").primaryKey(),
  // ON DELETE CASCADE: When client is deleted, all waitlist entries are automatically deleted
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  status: waitlistStatusEnum("status").notNull().default("waiting"),
  assignedRoomId: integer("assigned_room_id"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  confirmBy: timestamp("confirm_by", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Composite index for waitlist ordering queries
  statusPositionIdx: index("idx_waitlist_status_position").on(table.status, table.position),
  // Index on clientId for user waitlist lookup
  clientIdIdx: index("idx_waitlist_client_id").on(table.clientId),
  // Index on status for filtering
  statusIdx: index("idx_waitlist_status").on(table.status),
}));

export const insertWaitlistSchema = createInsertSchema(waitlistTable).omit({ id: true, createdAt: true });
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type WaitlistEntry = typeof waitlistTable.$inferSelect;
