ALTER TABLE "merchant_profiles" ADD COLUMN "verification_level" text DEFAULT 'BASIC' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchant_profiles" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
UPDATE "merchant_profiles" SET "verification_level" = 'VERIFIED', "verified_at" = now() WHERE "is_verified" = true;--> statement-breakpoint
CREATE TABLE "affiliate_clicks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "visitor_hash" text NOT NULL,
  "referer" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "affiliate_payout_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "amount" integer NOT NULL,
  "bank_name" text NOT NULL,
  "account_number" text NOT NULL,
  "account_holder" text NOT NULL,
  "status" text DEFAULT 'REQUESTED' NOT NULL,
  "admin_note" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "product_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "reporter_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "details" text NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "admin_note" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_partner_id_affiliate_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."affiliate_partners"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "affiliate_payout_requests" ADD CONSTRAINT "affiliate_payout_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "affiliate_payout_requests" ADD CONSTRAINT "affiliate_payout_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "product_reports" ADD CONSTRAINT "product_reports_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "product_reports" ADD CONSTRAINT "product_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "product_reports" ADD CONSTRAINT "product_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null;--> statement-breakpoint
CREATE INDEX "affiliate_clicks_partner_created_idx" ON "affiliate_clicks" ("partner_id","created_at");--> statement-breakpoint
CREATE INDEX "affiliate_clicks_product_created_idx" ON "affiliate_clicks" ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "affiliate_payout_requests_user_idx" ON "affiliate_payout_requests" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "affiliate_payout_requests_status_idx" ON "affiliate_payout_requests" ("status","created_at");--> statement-breakpoint
CREATE INDEX "product_reports_product_status_idx" ON "product_reports" ("product_id","status");--> statement-breakpoint
CREATE INDEX "product_reports_status_created_idx" ON "product_reports" ("status","created_at");
