ALTER TYPE "public"."resource_status" ADD VALUE 'maintenance';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "sms_reminders_enabled" text DEFAULT 'true' NOT NULL;--> statement-breakpoint
ALTER TABLE "lockers" ADD COLUMN "maintenance_notes" text;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "maintenance_notes" text;