DROP INDEX "enrollments_order_unique";--> statement-breakpoint
CREATE INDEX "enrollments_order_idx" ON "enrollments" USING btree ("order_id");