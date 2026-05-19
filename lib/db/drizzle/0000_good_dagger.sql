CREATE TYPE "public"."role" AS ENUM('STAFF', 'MANAGER');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('none', 'one_time', 'six_month');--> statement-breakpoint
CREATE TYPE "public"."membership_type" AS ENUM('one_time', 'six_month');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('available', 'occupied', 'reserved');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('locker', 'room');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('waiting', 'assigned', 'confirmed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('locker_rental', 'room_rental', 'membership', 'product', 'renewal', 'extension');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'STAFF' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"member_id" text,
	"membership_status" "membership_status" DEFAULT 'none' NOT NULL,
	"membership_expires_at" timestamp with time zone,
	"notes" text,
	"dob_encrypted" text,
	"address_encrypted" text,
	"document_number_encrypted" text,
	"dob_dek" text,
	"address_dek" text,
	"document_number_dek" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"type" "membership_type" NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"transaction_id" integer
);
--> statement-breakpoint
CREATE TABLE "lockers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" "resource_status" DEFAULT 'available' NOT NULL,
	"client_id" integer,
	"session_id" integer,
	"start_time" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "lockers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" "resource_status" DEFAULT 'available' NOT NULL,
	"client_id" integer,
	"session_id" integer,
	"start_time" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "rooms_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "rental_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"resource_type" "resource_type" NOT NULL,
	"resource_id" integer NOT NULL,
	"resource_name" text NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"start_time" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"end_time" timestamp with time zone,
	"amount_paid" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"position" integer NOT NULL,
	"status" "waitlist_status" DEFAULT 'waiting' NOT NULL,
	"assigned_room_id" integer,
	"assigned_at" timestamp with time zone,
	"confirm_by" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"type" "transaction_type" NOT NULL,
	"square_payment_id" text,
	"description" text,
	"session_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lockers" ADD CONSTRAINT "lockers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lockers" ADD CONSTRAINT "lockers_session_id_rental_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."rental_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_session_id_rental_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."rental_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental_sessions" ADD CONSTRAINT "rental_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clients_email" ON "clients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_clients_phone" ON "clients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_clients_member_id" ON "clients" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_clients_created_at" ON "clients" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_rental_sessions_client_status" ON "rental_sessions" USING btree ("client_id","status");--> statement-breakpoint
CREATE INDEX "idx_rental_sessions_resource" ON "rental_sessions" USING btree ("resource_type","resource_id","status");--> statement-breakpoint
CREATE INDEX "idx_rental_sessions_client_id" ON "rental_sessions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_rental_sessions_status" ON "rental_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_waitlist_status_position" ON "waitlist_entries" USING btree ("status","position");--> statement-breakpoint
CREATE INDEX "idx_waitlist_client_id" ON "waitlist_entries" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_waitlist_status" ON "waitlist_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_transactions_client_created" ON "transactions" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_created_at" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_client_id" ON "transactions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");