CREATE TYPE "public"."analytics_event" AS ENUM('PAGE_VIEW', 'CHECKOUT_STARTED', 'PURCHASE');--> statement-breakpoint
CREATE TYPE "public"."coupon_discount_type" AS ENUM('PERCENT', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."landing_template" AS ENUM('EDITORIAL', 'CREATOR', 'STUDIO');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"order_id" uuid,
	"event" "analytics_event" NOT NULL,
	"visitor_id" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid,
	"discount_amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"code" text NOT NULL,
	"discount_type" "coupon_discount_type" NOT NULL,
	"discount_value" integer NOT NULL,
	"max_redemptions" integer,
	"redemption_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_funnels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"order_bump_product_id" uuid,
	"upsell_product_id" uuid,
	"downsell_product_id" uuid,
	"bump_headline" text,
	"bump_description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal_amount" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_bump_product_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_bump_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "utm_medium" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
UPDATE "orders" SET "subtotal_amount" = "amount" WHERE "subtotal_amount" IS NULL;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "template" "landing_template" DEFAULT 'EDITORIAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "hero_video_url" text;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "instructor_name" text;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "instructor_role" text;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "instructor_bio" text;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "instructor_image_url" text;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "bonuses_text" text;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "testimonials_text" text;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "faq_text" text;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "guarantee_title" text;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "guarantee_text" text;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "compare_at_price" integer;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "promo_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "facebook_pixel_id" text;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD COLUMN "tiktok_pixel_id" text;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_funnels" ADD CONSTRAINT "product_funnels_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_funnels" ADD CONSTRAINT "product_funnels_order_bump_product_id_products_id_fk" FOREIGN KEY ("order_bump_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_funnels" ADD CONSTRAINT "product_funnels_upsell_product_id_products_id_fk" FOREIGN KEY ("upsell_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_funnels" ADD CONSTRAINT "product_funnels_downsell_product_id_products_id_fk" FOREIGN KEY ("downsell_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_product_event_idx" ON "analytics_events" USING btree ("product_id","event","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_events_order_purchase_unique" ON "analytics_events" USING btree ("order_id","event");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_redemptions_order_unique" ON "coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "coupon_redemptions_coupon_idx" ON "coupon_redemptions" USING btree ("coupon_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_product_code_unique" ON "coupons" USING btree ("product_id","code");--> statement-breakpoint
CREATE INDEX "coupons_product_active_idx" ON "coupons" USING btree ("product_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "product_funnels_product_unique" ON "product_funnels" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_order_bump_product_id_products_id_fk" FOREIGN KEY ("order_bump_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
