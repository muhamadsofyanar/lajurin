ALTER TYPE "public"."product_type" ADD VALUE IF NOT EXISTS 'DIGITAL' BEFORE 'SERVICE';--> statement-breakpoint
CREATE TYPE "public"."service_field_type" AS ENUM('TEXT', 'TEXTAREA');--> statement-breakpoint
CREATE TABLE "product_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "file_name" text NOT NULL,
  "storage_key" text NOT NULL,
  "mime_type" text NOT NULL,
  "size" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "service_product_fields" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "field_key" text NOT NULL,
  "label" text NOT NULL,
  "type" "service_field_type" DEFAULT 'TEXT' NOT NULL,
  "required" boolean DEFAULT false NOT NULL,
  "position" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "product_files" ADD CONSTRAINT "product_files_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_product_fields" ADD CONSTRAINT "service_product_fields_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "product_files_storage_unique" ON "product_files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "product_files_product_idx" ON "product_files" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_product_fields_key_unique" ON "service_product_fields" USING btree ("product_id","field_key");--> statement-breakpoint
CREATE UNIQUE INDEX "service_product_fields_position_unique" ON "service_product_fields" USING btree ("product_id","position");
