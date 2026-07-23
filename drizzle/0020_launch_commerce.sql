CREATE TYPE "public"."merchant_plan" AS ENUM('STARTER', 'PRO', 'BUSINESS');--> statement-breakpoint
ALTER TABLE "merchant_profiles" ADD COLUMN "plan" "merchant_plan" DEFAULT 'STARTER' NOT NULL;--> statement-breakpoint
CREATE TABLE "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "name" text NOT NULL,
  "price" integer NOT NULL,
  "stock" integer,
  "position" integer NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "merchant_customer_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "merchant_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "product_variant_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "product_variant_name" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_customer_records" ADD CONSTRAINT "merchant_customer_records_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_customer_records" ADD CONSTRAINT "merchant_customer_records_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_position_unique" ON "product_variants" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "product_variants_product_active_idx" ON "product_variants" USING btree ("product_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_customer_records_unique" ON "merchant_customer_records" USING btree ("merchant_id","customer_id");--> statement-breakpoint
CREATE INDEX "merchant_customer_records_merchant_idx" ON "merchant_customer_records" USING btree ("merchant_id","updated_at");
