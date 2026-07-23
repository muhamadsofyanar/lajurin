CREATE TYPE "public"."product_type" AS ENUM('COURSE', 'SERVICE');--> statement-breakpoint
CREATE TYPE "public"."service_case_status" AS ENUM('WAITING_PAYMENT', 'WAITING_DOCUMENTS', 'DOCUMENT_REVIEW', 'REVISION_REQUIRED', 'IN_PROGRESS', 'WAITING_AGENCY', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."service_note_visibility" AS ENUM('INTERNAL', 'CLIENT');--> statement-breakpoint
CREATE TYPE "public"."service_document_audience" AS ENUM('MERCHANT', 'CLIENT');--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "type" "product_type" DEFAULT 'COURSE' NOT NULL;--> statement-breakpoint
CREATE TABLE "service_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "merchant_id" uuid NOT NULL,
  "customer_id" uuid,
  "status" "service_case_status" DEFAULT 'WAITING_PAYMENT' NOT NULL,
  "assigned_to" uuid,
  "intake_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "target_date" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "service_case_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_case_id" uuid NOT NULL,
  "author_id" uuid NOT NULL,
  "visibility" "service_note_visibility" DEFAULT 'CLIENT' NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "service_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_case_id" uuid NOT NULL,
  "uploaded_by" uuid NOT NULL,
  "audience" "service_document_audience" NOT NULL,
  "label" text NOT NULL,
  "file_name" text NOT NULL,
  "storage_key" text NOT NULL,
  "mime_type" text NOT NULL,
  "size" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "service_cases" ADD CONSTRAINT "service_cases_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_cases" ADD CONSTRAINT "service_cases_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_cases" ADD CONSTRAINT "service_cases_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_cases" ADD CONSTRAINT "service_cases_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_case_notes" ADD CONSTRAINT "service_case_notes_case_id_fk" FOREIGN KEY ("service_case_id") REFERENCES "public"."service_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_case_notes" ADD CONSTRAINT "service_case_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_documents" ADD CONSTRAINT "service_documents_case_id_fk" FOREIGN KEY ("service_case_id") REFERENCES "public"."service_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_documents" ADD CONSTRAINT "service_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "service_cases_order_unique" ON "service_cases" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "service_cases_merchant_status_idx" ON "service_cases" USING btree ("merchant_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "service_cases_customer_idx" ON "service_cases" USING btree ("customer_id","updated_at");--> statement-breakpoint
CREATE INDEX "service_case_notes_case_idx" ON "service_case_notes" USING btree ("service_case_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_documents_storage_unique" ON "service_documents" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "service_documents_case_idx" ON "service_documents" USING btree ("service_case_id","created_at");
