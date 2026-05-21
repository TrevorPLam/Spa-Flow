import { pgTable, serial, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const specialEventsTable = pgTable("special_events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  disableSpecials: boolean("disable_specials").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  // Indexes for efficient date range queries
  startDateIdx: index("idx_special_events_start_date").on(table.startDate),
  endDateIdx: index("idx_special_events_end_date").on(table.endDate),
  // Composite index for finding active events within a date range
  dateRangeIdx: index("idx_special_events_date_range").on(table.startDate, table.endDate),
}));

export const insertSpecialEventSchema = createInsertSchema(specialEventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSpecialEvent = z.infer<typeof insertSpecialEventSchema>;
export type SpecialEvent = typeof specialEventsTable.$inferSelect;
