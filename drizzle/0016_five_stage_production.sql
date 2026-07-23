ALTER TYPE "public"."notification_status" ADD VALUE IF NOT EXISTS 'PROCESSING' AFTER 'PENDING';--> statement-breakpoint
ALTER TABLE "workspace_domains" ADD COLUMN "dns_status" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_domains" ADD COLUMN "cname_target" text;--> statement-breakpoint
ALTER TABLE "workspace_domains" ADD COLUMN "dns_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspace_domains" ADD COLUMN "ssl_status" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_domains" ADD COLUMN "ssl_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspace_domains" ADD COLUMN "last_error" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "marketing_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "marketing_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "marketing_consent_source" text;--> statement-breakpoint
ALTER TABLE "broadcast_campaigns" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "broadcast_campaigns" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "broadcast_campaigns" ADD COLUMN "recipient_limit" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "broadcast_campaigns" ADD COLUMN "queued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "broadcast_campaigns" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD COLUMN "recipient_name" text;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD COLUMN "action_url" text;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD COLUMN "provider" text DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD COLUMN "response_code" integer;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD COLUMN "provider_response" jsonb;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD COLUMN "consent_captured_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD COLUMN "last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "broadcast_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "merchant_id" uuid NOT NULL,
  "name" text NOT NULL,
  "subject" text,
  "message" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "broadcast_delivery_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "delivery_id" uuid NOT NULL,
  "attempt_number" integer NOT NULL,
  "status" "notification_status" NOT NULL,
  "response_code" integer,
  "provider_response" jsonb,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_campaigns" ADD CONSTRAINT "broadcast_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_templates" ADD CONSTRAINT "broadcast_templates_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_delivery_attempts" ADD CONSTRAINT "broadcast_delivery_attempts_delivery_id_broadcast_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."broadcast_deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "broadcast_campaigns_status_idx" ON "broadcast_campaigns" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "broadcast_deliveries_queue_idx" ON "broadcast_deliveries" USING btree ("status","next_attempt_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "broadcast_templates_merchant_name_unique" ON "broadcast_templates" USING btree ("merchant_id","name");--> statement-breakpoint
CREATE INDEX "broadcast_templates_merchant_idx" ON "broadcast_templates" USING btree ("merchant_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "broadcast_delivery_attempts_number_unique" ON "broadcast_delivery_attempts" USING btree ("delivery_id","attempt_number");--> statement-breakpoint
CREATE INDEX "broadcast_delivery_attempts_delivery_idx" ON "broadcast_delivery_attempts" USING btree ("delivery_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_merchant_marketing_idx" ON "orders" USING btree ("marketing_consent","created_at") WHERE "marketing_consent" = true;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ALTER COLUMN "provider" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "broadcast_deliveries" ALTER COLUMN "consent_captured_at" DROP DEFAULT;
