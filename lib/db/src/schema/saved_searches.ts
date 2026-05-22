import { pgTable, text, serial, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const savedSearchesTable = pgTable("saved_searches", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  filters: jsonb("filters").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  // Index for user's saved searches
  userIdIdx: index("idx_saved_searches_user_id").on(table.userId),
  // Index for name search
  nameIdx: index("idx_saved_searches_name").on(table.name),
}));

export const insertSavedSearchSchema = createInsertSchema(savedSearchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>;
export type SavedSearch = typeof savedSearchesTable.$inferSelect;
