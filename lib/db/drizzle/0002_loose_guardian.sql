CREATE TYPE "public"."auth_action" AS ENUM('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT');--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "correlation_id" text;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_correlation_id" ON "audit_logs" USING btree ("correlation_id");