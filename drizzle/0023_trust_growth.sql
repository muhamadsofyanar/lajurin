ALTER TABLE "merchant_profiles" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" text DEFAULT 'LAINNYA' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "products" SET "category" = CASE
  WHEN "type" = 'COURSE' THEN 'PENDIDIKAN'
  WHEN "type" = 'DIGITAL' THEN 'PRODUK DIGITAL'
  WHEN "type" = 'SERVICE' THEN 'JASA PROFESIONAL'
  ELSE 'LAINNYA'
END;--> statement-breakpoint
CREATE TABLE "product_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "rating" integer NOT NULL,
  "title" text,
  "content" text NOT NULL,
  "status" text DEFAULT 'PUBLISHED' NOT NULL,
  "merchant_reply" text,
  "replied_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "product_reviews_order_unique" ON "product_reviews" ("order_id");--> statement-breakpoint
CREATE INDEX "product_reviews_product_status_idx" ON "product_reviews" ("product_id","status","created_at");--> statement-breakpoint
CREATE INDEX "product_reviews_customer_idx" ON "product_reviews" ("customer_id","created_at");
