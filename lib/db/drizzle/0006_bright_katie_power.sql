CREATE TABLE "special_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"disable_specials" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_special_events_start_date" ON "special_events" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "idx_special_events_end_date" ON "special_events" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "idx_special_events_date_range" ON "special_events" USING btree ("start_date","end_date");