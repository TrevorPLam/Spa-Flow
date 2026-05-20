import { pgTable, serial, integer, timestamp, text, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  replacedBy: integer("replaced_by"),
  userAgent: text("user_agent"),
}, (table) => ({
  userIdIdx: index("idx_refresh_tokens_user_id").on(table.userId),
  tokenHashIdx: index("idx_refresh_tokens_token_hash").on(table.tokenHash),
  expiresAtIdx: index("idx_refresh_tokens_expires_at").on(table.expiresAt),
}));

export const insertRefreshTokenSchema = createInsertSchema(refreshTokensTable).omit({ id: true, createdAt: true });
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type RefreshToken = typeof refreshTokensTable.$inferSelect;
