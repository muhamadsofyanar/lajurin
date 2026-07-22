CREATE TYPE "public"."payment_settlement_mode" AS ENUM('PLATFORM', 'MERCHANT_DIRECT');--> statement-breakpoint
CREATE TYPE "public"."platform_receivable_entry_type" AS ENUM('MANUAL_SALE_FEE', 'MANUAL_SALE_FEE_REVERSAL', 'PAYMENT', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "merchant_manual_payment_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_holder" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_receivable_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"order_id" uuid,
	"type" "platform_receivable_entry_type" NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "settlement_mode" "payment_settlement_mode" DEFAULT 'PLATFORM' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "manual_destination_bank" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "manual_destination_account" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "manual_destination_holder" text;--> statement-breakpoint
ALTER TABLE "merchant_manual_payment_accounts" ADD CONSTRAINT "merchant_manual_payment_accounts_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_receivable_entries" ADD CONSTRAINT "platform_receivable_entries_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_receivable_entries" ADD CONSTRAINT "platform_receivable_entries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_receivable_entries" ADD CONSTRAINT "platform_receivable_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_manual_payment_accounts_merchant_unique" ON "merchant_manual_payment_accounts" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "platform_receivable_entries_merchant_idx" ON "platform_receivable_entries" USING btree ("merchant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_receivable_entries_order_type_unique" ON "platform_receivable_entries" USING btree ("order_id","type");