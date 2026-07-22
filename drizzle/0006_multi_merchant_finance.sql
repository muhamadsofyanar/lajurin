CREATE TYPE "public"."ledger_entry_type" AS ENUM('SALE', 'PAYOUT', 'PAYOUT_REVERSAL', 'REFUND', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."merchant_status" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('REQUESTED', 'PAID', 'REJECTED');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"order_id" uuid,
	"payout_id" uuid,
	"type" "ledger_entry_type" NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_payout_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_holder" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"status" "payout_status" DEFAULT 'REQUESTED' NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_holder" text NOT NULL,
	"merchant_note" text,
	"admin_note" text,
	"transfer_reference" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"default_platform_fee_bps" integer DEFAULT 0 NOT NULL,
	"minimum_payout_amount" integer DEFAULT 100000 NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merchant_profiles" ADD COLUMN "status" "merchant_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "merchant_profiles" ADD COLUMN "platform_fee_bps" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "platform_fee_bps" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "platform_fee_amount" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "merchant_net_amount" integer;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_ledger_entries" ADD CONSTRAINT "merchant_ledger_entries_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_ledger_entries" ADD CONSTRAINT "merchant_ledger_entries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_ledger_entries" ADD CONSTRAINT "merchant_ledger_entries_payout_id_merchant_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."merchant_payouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_ledger_entries" ADD CONSTRAINT "merchant_ledger_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_payout_accounts" ADD CONSTRAINT "merchant_payout_accounts_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_payouts" ADD CONSTRAINT "merchant_payouts_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_payouts" ADD CONSTRAINT "merchant_payouts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "merchant_ledger_entries_merchant_idx" ON "merchant_ledger_entries" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_ledger_entries_order_type_unique" ON "merchant_ledger_entries" USING btree ("order_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_ledger_entries_payout_type_unique" ON "merchant_ledger_entries" USING btree ("payout_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_payout_accounts_merchant_unique" ON "merchant_payout_accounts" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "merchant_payouts_merchant_idx" ON "merchant_payouts" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE INDEX "merchant_payouts_status_idx" ON "merchant_payouts" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "merchant_profiles" ADD CONSTRAINT "merchant_profiles_platform_fee_bounds" CHECK ("platform_fee_bps" IS NULL OR ("platform_fee_bps" >= 0 AND "platform_fee_bps" <= 10000));--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_singleton" CHECK ("id" = 1);--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_fee_bounds" CHECK ("default_platform_fee_bps" >= 0 AND "default_platform_fee_bps" <= 10000);--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_minimum_payout_positive" CHECK ("minimum_payout_amount" > 0);--> statement-breakpoint
ALTER TABLE "merchant_payouts" ADD CONSTRAINT "merchant_payouts_amount_positive" CHECK ("amount" > 0);--> statement-breakpoint
ALTER TABLE "merchant_ledger_entries" ADD CONSTRAINT "merchant_ledger_entries_amount_nonzero" CHECK ("amount" <> 0);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_accounting_nonnegative" CHECK (("platform_fee_amount" IS NULL OR "platform_fee_amount" >= 0) AND ("merchant_net_amount" IS NULL OR "merchant_net_amount" >= 0));--> statement-breakpoint
INSERT INTO "platform_settings" ("id", "default_platform_fee_bps", "minimum_payout_amount") VALUES (1, 0, 100000) ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
UPDATE "merchant_profiles" SET "status" = 'ACTIVE', "updated_at" = now();--> statement-breakpoint
UPDATE "orders" AS o
SET
	"platform_fee_bps" = 0,
	"platform_fee_amount" = 0,
	"merchant_net_amount" = o."amount",
	"updated_at" = now()
WHERE o."status" = 'PAID' AND o."merchant_net_amount" IS NULL;--> statement-breakpoint
INSERT INTO "merchant_ledger_entries" ("merchant_id", "order_id", "type", "amount", "description", "created_at")
SELECT p."merchant_id", o."id", 'SALE', o."merchant_net_amount", 'Saldo bersih penjualan ' || o."external_id", COALESCE(o."paid_at", o."created_at")
FROM "orders" o
INNER JOIN "products" p ON p."id" = o."product_id"
WHERE o."status" = 'PAID' AND o."merchant_net_amount" > 0
ON CONFLICT ("order_id", "type") DO NOTHING;
