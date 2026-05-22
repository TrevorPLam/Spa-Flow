CREATE TYPE "public"."reconciliation_status" AS ENUM('matched', 'discrepancy', 'pending');--> statement-breakpoint
CREATE TABLE "reconciliation_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"total_internal" numeric(10, 2) NOT NULL,
	"total_square" numeric(10, 2) NOT NULL,
	"discrepancies" jsonb NOT NULL,
	"status" "reconciliation_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_reconciliation_date" ON "reconciliation_results" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_reconciliation_status" ON "reconciliation_results" USING btree ("status");