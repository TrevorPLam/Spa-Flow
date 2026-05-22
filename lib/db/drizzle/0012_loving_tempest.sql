CREATE TABLE "saved_searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_saved_searches_user_id" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_saved_searches_name" ON "saved_searches" USING btree ("name");