ALTER TABLE "affiliate_commissions" ADD COLUMN "payout_request_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stock_released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_payout_request_id_affiliate_payout_requests_id_fk" FOREIGN KEY ("payout_request_id") REFERENCES "public"."affiliate_payout_requests"("id") ON DELETE restrict;--> statement-breakpoint
CREATE INDEX "affiliate_commissions_payout_idx" ON "affiliate_commissions" ("payout_request_id","status");--> statement-breakpoint
UPDATE "merchant_profiles" SET "verification_level" = 'IDENTITY' WHERE "verification_level" = 'VERIFIED';
