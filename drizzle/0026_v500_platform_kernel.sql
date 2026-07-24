-- Rizqhub v5 platform-kernel migration compatibility hotfix.
-- Safely normalizes legacy enum labels and tolerates pre-existing platform-kernel objects.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'outbox_event_status'
  ) THEN
    CREATE TYPE public.outbox_event_status AS ENUM (
      'PENDING', 'PROCESSING', 'RETRY', 'COMPLETED', 'DEAD_LETTER'
    );
  ELSE
    -- Legacy production values are semantically equivalent. RENAME VALUE preserves rows.
    IF EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public' AND t.typname = 'outbox_event_status'
        AND e.enumlabel = 'PROCESSED'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public' AND t.typname = 'outbox_event_status'
        AND e.enumlabel = 'COMPLETED'
    ) THEN
      ALTER TYPE public.outbox_event_status RENAME VALUE 'PROCESSED' TO 'COMPLETED';
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public' AND t.typname = 'outbox_event_status'
        AND e.enumlabel = 'DEAD'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public' AND t.typname = 'outbox_event_status'
        AND e.enumlabel = 'DEAD_LETTER'
    ) THEN
      ALTER TYPE public.outbox_event_status RENAME VALUE 'DEAD' TO 'DEAD_LETTER';
    END IF;

    ALTER TYPE public.outbox_event_status ADD VALUE IF NOT EXISTS 'PENDING';
    ALTER TYPE public.outbox_event_status ADD VALUE IF NOT EXISTS 'PROCESSING';
    ALTER TYPE public.outbox_event_status ADD VALUE IF NOT EXISTS 'RETRY';
    ALTER TYPE public.outbox_event_status ADD VALUE IF NOT EXISTS 'COMPLETED';
    ALTER TYPE public.outbox_event_status ADD VALUE IF NOT EXISTS 'DEAD_LETTER';
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'job_run_status'
  ) THEN
    CREATE TYPE public.job_run_status AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');
  ELSE
    ALTER TYPE public.job_run_status ADD VALUE IF NOT EXISTS 'RUNNING';
    ALTER TYPE public.job_run_status ADD VALUE IF NOT EXISTS 'SUCCEEDED';
    ALTER TYPE public.job_run_status ADD VALUE IF NOT EXISTS 'FAILED';
    ALTER TYPE public.job_run_status ADD VALUE IF NOT EXISTS 'PARTIAL';
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'job_attempt_status'
  ) THEN
    CREATE TYPE public.job_attempt_status AS ENUM ('SUCCEEDED', 'FAILED', 'SKIPPED');
  ELSE
    ALTER TYPE public.job_attempt_status ADD VALUE IF NOT EXISTS 'SUCCEEDED';
    ALTER TYPE public.job_attempt_status ADD VALUE IF NOT EXISTS 'FAILED';
    ALTER TYPE public.job_attempt_status ADD VALUE IF NOT EXISTS 'SKIPPED';
  END IF;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  workspace_id uuid,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  event_version integer DEFAULT 1 NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  status public.outbox_event_status DEFAULT 'PENDING' NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  max_attempts integer DEFAULT 8 NOT NULL,
  available_at timestamp with time zone DEFAULT now() NOT NULL,
  locked_at timestamp with time zone,
  locked_by text,
  last_error text,
  correlation_id text NOT NULL,
  causation_id text,
  deduplication_key text,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT outbox_events_attempts_nonnegative CHECK (attempts >= 0),
  CONSTRAINT outbox_events_max_attempts_positive CHECK (max_attempts > 0),
  CONSTRAINT outbox_events_event_version_positive CHECK (event_version > 0)
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.event_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  event_id uuid NOT NULL,
  consumer_name text NOT NULL,
  processed_at timestamp with time zone DEFAULT now() NOT NULL,
  result jsonb DEFAULT '{}'::jsonb NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  job_name text NOT NULL,
  worker_id text NOT NULL,
  status public.job_run_status DEFAULT 'RUNNING' NOT NULL,
  correlation_id text NOT NULL,
  claimed_count integer DEFAULT 0 NOT NULL,
  succeeded_count integer DEFAULT 0 NOT NULL,
  failed_count integer DEFAULT 0 NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  error_message text,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  finished_at timestamp with time zone,
  CONSTRAINT job_runs_counts_nonnegative CHECK (
    claimed_count >= 0 AND succeeded_count >= 0 AND failed_count >= 0
  )
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.job_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  job_run_id uuid NOT NULL,
  outbox_event_id uuid,
  attempt_number integer NOT NULL,
  status public.job_attempt_status NOT NULL,
  error_message text,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  finished_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT job_attempts_attempt_positive CHECK (attempt_number > 0)
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.dead_letter_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  outbox_event_id uuid NOT NULL,
  reason text NOT NULL,
  payload_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
  failed_at timestamp with time zone DEFAULT now() NOT NULL,
  replayed_at timestamp with time zone,
  replayed_by uuid
);--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'outbox_events_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE public.outbox_events
      ADD CONSTRAINT outbox_events_workspace_id_workspaces_id_fk
      FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_consumptions_event_id_outbox_events_id_fk') THEN
    ALTER TABLE public.event_consumptions
      ADD CONSTRAINT event_consumptions_event_id_outbox_events_id_fk
      FOREIGN KEY (event_id) REFERENCES public.outbox_events(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_attempts_job_run_id_job_runs_id_fk') THEN
    ALTER TABLE public.job_attempts
      ADD CONSTRAINT job_attempts_job_run_id_job_runs_id_fk
      FOREIGN KEY (job_run_id) REFERENCES public.job_runs(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_attempts_outbox_event_id_outbox_events_id_fk') THEN
    ALTER TABLE public.job_attempts
      ADD CONSTRAINT job_attempts_outbox_event_id_outbox_events_id_fk
      FOREIGN KEY (outbox_event_id) REFERENCES public.outbox_events(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dead_letter_events_outbox_event_id_outbox_events_id_fk') THEN
    ALTER TABLE public.dead_letter_events
      ADD CONSTRAINT dead_letter_events_outbox_event_id_outbox_events_id_fk
      FOREIGN KEY (outbox_event_id) REFERENCES public.outbox_events(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dead_letter_events_replayed_by_users_id_fk') THEN
    ALTER TABLE public.dead_letter_events
      ADD CONSTRAINT dead_letter_events_replayed_by_users_id_fk
      FOREIGN KEY (replayed_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS outbox_events_ready_idx
  ON public.outbox_events USING btree (status, available_at, occurred_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS outbox_events_workspace_idx
  ON public.outbox_events USING btree (workspace_id, occurred_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS outbox_events_aggregate_idx
  ON public.outbox_events USING btree (aggregate_type, aggregate_id, occurred_at);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS outbox_events_deduplication_unique
  ON public.outbox_events USING btree (event_type, deduplication_key);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS event_consumptions_event_consumer_unique
  ON public.event_consumptions USING btree (event_id, consumer_name);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS event_consumptions_consumer_idx
  ON public.event_consumptions USING btree (consumer_name, processed_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS job_runs_name_started_idx
  ON public.job_runs USING btree (job_name, started_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS job_runs_status_started_idx
  ON public.job_runs USING btree (status, started_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS job_attempts_run_idx
  ON public.job_attempts USING btree (job_run_id, started_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS job_attempts_event_idx
  ON public.job_attempts USING btree (outbox_event_id, started_at);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS dead_letter_events_outbox_unique
  ON public.dead_letter_events USING btree (outbox_event_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS dead_letter_events_failed_idx
  ON public.dead_letter_events USING btree (failed_at);
