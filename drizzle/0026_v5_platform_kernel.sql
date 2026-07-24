CREATE TYPE "public"."outbox_event_status" AS ENUM('PENDING', 'PROCESSING', 'RETRY', 'PROCESSED', 'DEAD');--> statement-breakpoint
CREATE TYPE "public"."event_consumption_status" AS ENUM('PROCESSING', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."job_run_status" AS ENUM('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."job_attempt_status" AS ENUM('RUNNING', 'SUCCEEDED', 'FAILED');--> statement-breakpoint

ALTER TABLE "products" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint

ALTER TABLE "products" ADD CONSTRAINT "products_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict;--> statement-breakpoint

UPDATE "products" AS product
SET "workspace_id" = link."workspace_id"
FROM "legacy_merchant_workspace_links" AS link
WHERE product."merchant_id" = link."legacy_merchant_user_id"
  AND product."workspace_id" IS NULL;--> statement-breakpoint

UPDATE "orders" AS order_record
SET "workspace_id" = product."workspace_id"
FROM "products" AS product
WHERE order_record."product_id" = product."id"
  AND order_record."workspace_id" IS NULL;--> statement-breakpoint

UPDATE "webhook_events" AS webhook
SET "workspace_id" = order_record."workspace_id"
FROM "orders" AS order_record
WHERE webhook."order_id" = order_record."id"
  AND webhook."workspace_id" IS NULL;--> statement-breakpoint

CREATE INDEX "products_workspace_status_idx" ON "products" ("workspace_id", "status");--> statement-breakpoint
CREATE INDEX "orders_workspace_status_idx" ON "orders" ("workspace_id", "status", "created_at");--> statement-breakpoint
CREATE INDEX "webhook_events_workspace_created_idx" ON "webhook_events" ("workspace_id", "created_at");--> statement-breakpoint

CREATE TABLE "outbox_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_name" text NOT NULL,
  "event_version" integer DEFAULT 1 NOT NULL,
  "occurred_at" timestamptz DEFAULT now() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "actor_id" uuid,
  "subject_type" text NOT NULL,
  "subject_id" text NOT NULL,
  "correlation_id" text NOT NULL,
  "causation_id" text,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "outbox_event_status" DEFAULT 'PENDING' NOT NULL,
  "available_at" timestamptz DEFAULT now() NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "locked_at" timestamptz,
  "locked_by" text,
  "last_error" text,
  "processed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "outbox_events_attempt_count_check" CHECK ("attempt_count" >= 0),
  CONSTRAINT "outbox_events_max_attempts_check" CHECK ("max_attempts" BETWEEN 1 AND 20),
  CONSTRAINT "outbox_events_event_version_check" CHECK ("event_version" > 0)
);--> statement-breakpoint

CREATE TABLE "event_consumptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "consumer_name" text NOT NULL,
  "status" "event_consumption_status" DEFAULT 'PROCESSING' NOT NULL,
  "attempt_count" integer DEFAULT 1 NOT NULL,
  "last_error" text,
  "processed_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "event_consumptions_attempt_count_check" CHECK ("attempt_count" > 0)
);--> statement-breakpoint

CREATE TABLE "job_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "worker_name" text NOT NULL,
  "correlation_id" text NOT NULL,
  "requested_by" text,
  "status" "job_run_status" DEFAULT 'RUNNING' NOT NULL,
  "claimed_count" integer DEFAULT 0 NOT NULL,
  "processed_count" integer DEFAULT 0 NOT NULL,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "finished_at" timestamptz,
  CONSTRAINT "job_runs_counts_check" CHECK ("claimed_count" >= 0 AND "processed_count" >= 0 AND "failed_count" >= 0)
);--> statement-breakpoint

CREATE TABLE "job_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_run_id" uuid NOT NULL,
  "event_id" uuid NOT NULL,
  "attempt_number" integer NOT NULL,
  "status" "job_attempt_status" DEFAULT 'RUNNING' NOT NULL,
  "error_message" text,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "finished_at" timestamptz,
  CONSTRAINT "job_attempts_number_check" CHECK ("attempt_number" > 0)
);--> statement-breakpoint

CREATE TABLE "dead_letter_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "workspace_id" uuid NOT NULL,
  "event_name" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "attempt_count" integer NOT NULL,
  "last_error" text NOT NULL,
  "failed_at" timestamptz DEFAULT now() NOT NULL,
  "replayed_at" timestamptz,
  "replayed_by" text,
  CONSTRAINT "dead_letter_events_attempt_count_check" CHECK ("attempt_count" > 0)
);--> statement-breakpoint

ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_actor_id_users_id_fk"
  FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "event_consumptions" ADD CONSTRAINT "event_consumptions_event_id_outbox_events_id_fk"
  FOREIGN KEY ("event_id") REFERENCES "public"."outbox_events"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "event_consumptions" ADD CONSTRAINT "event_consumptions_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_job_run_id_job_runs_id_fk"
  FOREIGN KEY ("job_run_id") REFERENCES "public"."job_runs"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "job_attempts" ADD CONSTRAINT "job_attempts_event_id_outbox_events_id_fk"
  FOREIGN KEY ("event_id") REFERENCES "public"."outbox_events"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "dead_letter_events" ADD CONSTRAINT "dead_letter_events_event_id_outbox_events_id_fk"
  FOREIGN KEY ("event_id") REFERENCES "public"."outbox_events"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "dead_letter_events" ADD CONSTRAINT "dead_letter_events_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict;--> statement-breakpoint

CREATE INDEX "outbox_events_status_available_idx" ON "outbox_events" ("status", "available_at", "occurred_at");--> statement-breakpoint
CREATE INDEX "outbox_events_workspace_occurred_idx" ON "outbox_events" ("workspace_id", "occurred_at");--> statement-breakpoint
CREATE INDEX "outbox_events_correlation_idx" ON "outbox_events" ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_consumptions_consumer_event_unique" ON "event_consumptions" ("consumer_name", "event_id");--> statement-breakpoint
CREATE INDEX "event_consumptions_workspace_status_idx" ON "event_consumptions" ("workspace_id", "status", "updated_at");--> statement-breakpoint
CREATE INDEX "job_runs_worker_started_idx" ON "job_runs" ("worker_name", "started_at");--> statement-breakpoint
CREATE INDEX "job_runs_status_started_idx" ON "job_runs" ("status", "started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "job_attempts_event_number_unique" ON "job_attempts" ("event_id", "attempt_number");--> statement-breakpoint
CREATE INDEX "job_attempts_run_status_idx" ON "job_attempts" ("job_run_id", "status");--> statement-breakpoint
CREATE UNIQUE INDEX "dead_letter_events_event_unique" ON "dead_letter_events" ("event_id");--> statement-breakpoint
CREATE INDEX "dead_letter_events_workspace_failed_idx" ON "dead_letter_events" ("workspace_id", "failed_at");--> statement-breakpoint

ALTER TABLE "outbox_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outbox_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "outbox_events_workspace_policy" ON "outbox_events"
  USING (
    "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR current_setting('app.control_plane', true) = 'on'
  )
  WITH CHECK (
    "workspace_id" = NULLIF(current_setting('app.workspace_id', true), '')::uuid
    OR current_setting('app.control_plane', true) = 'on'
  );
