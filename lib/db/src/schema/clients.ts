import { pgTable, text, serial, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const membershipStatusEnum = pgEnum("membership_status", ["none", "one_time", "six_month"]);

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  memberId: text("member_id").unique(),
  membershipStatus: membershipStatusEnum("membership_status").notNull().default("none"),
  membershipExpiresAt: timestamp("membership_expires_at", { withTimezone: true }),
  notes: text("notes"),
  smsRemindersEnabled: text("sms_reminders_enabled").notNull().default("true"),
  // Encrypted PII fields (stored as base64-encoded ciphertext JSON)
  dobEncrypted: text("dob_encrypted"),      // date of birth
  addressEncrypted: text("address_encrypted"),
  documentNumberEncrypted: text("document_number_encrypted"),
  // DEKs encrypted by KEK (envelope encryption)
  dobDek: text("dob_dek"),
  addressDek: text("address_dek"),
  documentNumberDek: text("document_number_dek"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  // Indexes for client search and authentication lookups
  emailIdx: index("idx_clients_email").on(table.email),
  phoneIdx: index("idx_clients_phone").on(table.phone),
  memberIdIdx: index("idx_clients_member_id").on(table.memberId),
  createdAtIdx: index("idx_clients_created_at").on(table.createdAt),
}));

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
