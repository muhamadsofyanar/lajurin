ALTER TYPE "public"."notification_event" ADD VALUE IF NOT EXISTS 'CHECKOUT_REMINDER';--> statement-breakpoint
CREATE TABLE "affiliate_programs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "commission_bps" integer NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "affiliate_partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "program_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "code" text NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "affiliate_commissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "partner_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "amount" integer NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "affiliate_partner_id" uuid;--> statement-breakpoint
CREATE TABLE "booking_slots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "capacity" integer DEFAULT 1 NOT NULL,
  "booked_count" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "booking_appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slot_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "status" text DEFAULT 'CONFIRMED' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "product_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "interval_months" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'ACTIVE' NOT NULL,
  "renews_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "external_subscription_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "affiliate_programs" ADD CONSTRAINT "affiliate_programs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "affiliate_partners" ADD CONSTRAINT "affiliate_partners_program_id_affiliate_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."affiliate_programs"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "affiliate_partners" ADD CONSTRAINT "affiliate_partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_partner_id_affiliate_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."affiliate_partners"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_affiliate_partner_id_affiliate_partners_id_fk" FOREIGN KEY ("affiliate_partner_id") REFERENCES "public"."affiliate_partners"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "booking_appointments" ADD CONSTRAINT "booking_appointments_slot_id_booking_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."booking_slots"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "booking_appointments" ADD CONSTRAINT "booking_appointments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "booking_appointments" ADD CONSTRAINT "booking_appointments_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict;--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_programs_product_unique" ON "affiliate_programs" ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_partners_program_user_unique" ON "affiliate_partners" ("program_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_partners_code_unique" ON "affiliate_partners" ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_commissions_order_unique" ON "affiliate_commissions" ("order_id");--> statement-breakpoint
CREATE INDEX "affiliate_commissions_partner_idx" ON "affiliate_commissions" ("partner_id","status","created_at");--> statement-breakpoint
CREATE INDEX "booking_slots_product_start_idx" ON "booking_slots" ("product_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "booking_appointments_order_unique" ON "booking_appointments" ("order_id");--> statement-breakpoint
CREATE INDEX "booking_appointments_customer_idx" ON "booking_appointments" ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "product_subscriptions_customer_idx" ON "product_subscriptions" ("customer_id","status");--> statement-breakpoint
CREATE INDEX "product_subscriptions_product_idx" ON "product_subscriptions" ("product_id","status");
