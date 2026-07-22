CREATE TYPE "public"."webhook_processing_status" AS ENUM('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'XENDIT' NOT NULL,
	"fingerprint" text NOT NULL,
	"request_id" text NOT NULL,
	"event_name" text,
	"external_id" text,
	"order_id" uuid,
	"status" "webhook_processing_status" DEFAULT 'RECEIVED' NOT NULL,
	"response_status" integer,
	"payload" jsonb,
	"error_message" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_amount" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_reference" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_reason" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_by" uuid;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rate_limits_blocked_idx" ON "rate_limits" USING btree ("blocked_until");--> statement-breakpoint
CREATE INDEX "rate_limits_updated_idx" ON "rate_limits" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_fingerprint_unique" ON "webhook_events" USING btree ("provider","fingerprint");--> statement-breakpoint
CREATE INDEX "webhook_events_created_idx" ON "webhook_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_events_order_idx" ON "webhook_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_events_status_idx" ON "webhook_events" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_refunded_by_users_id_fk" FOREIGN KEY ("refunded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;