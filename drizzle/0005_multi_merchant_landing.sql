CREATE TABLE "merchant_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brand_name" text NOT NULL,
	"slug" text NOT NULL,
	"headline" text,
	"bio" text,
	"logo_url" text,
	"support_email" text,
	"whatsapp" text,
	"accent_color" text DEFAULT '#163d2d' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_landing_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"eyebrow" text,
	"hero_title" text,
	"hero_subtitle" text,
	"cover_image_url" text,
	"benefits_text" text,
	"audience_text" text,
	"cta_text" text DEFAULT 'Dapatkan akses' NOT NULL,
	"accent_color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merchant_profiles" ADD CONSTRAINT "merchant_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_landing_pages" ADD CONSTRAINT "product_landing_pages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "merchant_profiles" ("user_id", "brand_name", "slug", "support_email")
SELECT "id", "name", 'merchant-' || substring(replace("id"::text, '-', '') from 1 for 10), "email"
FROM "users"
WHERE "role" = 'MERCHANT';--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_profiles_user_unique" ON "merchant_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_profiles_slug_unique" ON "merchant_profiles" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "product_landing_pages_product_unique" ON "product_landing_pages" USING btree ("product_id");
