CREATE TYPE "public"."commission_payment_status" AS ENUM('SUBMITTED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."feature_flag_rollout" AS ENUM('OFF', 'ALL', 'USERS');--> statement-breakpoint
ALTER TYPE "public"."workspace_membership_role" ADD VALUE 'FINANCE' BEFORE 'MEMBER';--> statement-breakpoint
ALTER TYPE "public"."workspace_membership_role" ADD VALUE 'STAFF' BEFORE 'MEMBER';--> statement-breakpoint
CREATE TABLE "commission_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"proof_file_name" text NOT NULL,
	"destination_bank" text NOT NULL,
	"destination_account" text NOT NULL,
	"destination_holder" text NOT NULL,
	"merchant_note" text,
	"status" "commission_payment_status" DEFAULT 'SUBMITTED' NOT NULL,
	"admin_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"rollout" "feature_flag_rollout" DEFAULT 'OFF' NOT NULL,
	"audience_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "commission_bank_name" text;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "commission_account_number" text;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "commission_account_holder" text;--> statement-breakpoint
ALTER TABLE "commission_payments" ADD CONSTRAINT "commission_payments_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_payments" ADD CONSTRAINT "commission_payments_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_feature_flags" ADD CONSTRAINT "platform_feature_flags_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commission_payments_merchant_idx" ON "commission_payments" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "commission_payments_status_idx" ON "commission_payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "platform_feature_flags_rollout_idx" ON "platform_feature_flags" USING btree ("rollout");--> statement-breakpoint
INSERT INTO "platform_feature_flags" ("key", "name", "description", "rollout", "audience_user_ids") VALUES
  ('WORKSPACE_TEAMS', 'Workspace & tim', 'Pengelolaan anggota dan peran workspace.', 'OFF', '[]'::jsonb),
  ('DIRECT_MANUAL_PAYMENTS', 'Transfer langsung merchant', 'Transfer manual langsung ke rekening merchant dan konfirmasi merchant.', 'OFF', '[]'::jsonb),
  ('COMMISSION_BILLING', 'Tagihan komisi', 'Pengajuan dan verifikasi pelunasan komisi merchant.', 'OFF', '[]'::jsonb),
  ('LANDING_PAGE_BUILDER', 'Landing Page Builder', 'Editor halaman penjualan dan pratinjau publik.', 'OFF', '[]'::jsonb),
  ('SALES_REPORTS', 'Laporan penjualan', 'Ringkasan berperiode dan ekspor CSV penjualan.', 'OFF', '[]'::jsonb),
  ('BASIC_NOTIFICATIONS', 'Notifikasi dasar', 'Notifikasi in-app untuk kejadian operasional penting.', 'OFF', '[]'::jsonb)
ON CONFLICT ("key") DO NOTHING;
