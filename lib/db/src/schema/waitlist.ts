import { pgTable, serial, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const waitlistStatusEnum = pgEnum("waitlist_status", ["waiting", "assigned", "confirmed", "expired"]);

export const waitlistTable = pgTable("waitlist_entries", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id),
  position: integer("position").notNull(),
  status: waitlistStatusEnum("status").notNull().default("waiting"),
  assignedRoomId: integer("assigned_room_id"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  confirmBy: timestamp("confirm_by", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWaitlistSchema = createInsertSchema(waitlistTable).omit({ id: true, createdAt: true });
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type WaitlistEntry = typeof waitlistTable.$inferSelect;
