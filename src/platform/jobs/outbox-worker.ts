import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";
import { resolveDomainEventHandler } from "@/platform/events/handlers";
import type { DomainEvent, DomainEventHandler } from "@/platform/events/types";
import { structuredLog } from "@/platform/observability/logger";
import { outboxRetryDelayMs } from "./retry-policy";

type OutboxRow = {
  id: string;
  workspace_id: string | null;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  event_version: number;
  payload: Record<string, unknown> | null;
  attempts: number;
  max_attempts: number;
  correlation_id: string;
  causation_id: string | null;
  occurred_at: Date;
};

export type OutboxWorkerOptions = Readonly<{
  workerId?: string;
  consumerName?: string;
  batchSize?: number;
  leaseMs?: number;
  resolveHandler?: (eventType: string) => DomainEventHandler | null;
}>;

export type OutboxWorkerResult = Readonly<{
  jobRunId: string | null;
  workerId: string;
  claimed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
}>;

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number) {
  if (!Number.isInteger(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value!));
}

function errorMessage(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 2_000);
}

function domainEvent(row: OutboxRow): DomainEvent {
  return Object.freeze({
    id: row.id,
    workspaceId: row.workspace_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    eventVersion: row.event_version,
    payload: row.payload ?? {},
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    occurredAt: new Date(row.occurred_at),
  });
}

async function claimEvents(input: {
  workerId: string;
  batchSize: number;
  leaseMs: number;
}) {
  const result = await pool.query<OutboxRow>(
    `WITH candidates AS (
       SELECT id
       FROM outbox_events
       WHERE (
         (status IN ('PENDING', 'RETRY') AND available_at <= now())
         OR (status = 'PROCESSING' AND locked_at < now() - ($3::int * interval '1 millisecond'))
       )
       ORDER BY available_at ASC, occurred_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
     UPDATE outbox_events AS event
     SET status = 'PROCESSING',
         attempts = event.attempts + 1,
         locked_at = now(),
         locked_by = $2,
         last_error = NULL,
         updated_at = now()
     FROM candidates
     WHERE event.id = candidates.id
     RETURNING event.id, event.workspace_id, event.aggregate_type, event.aggregate_id,
       event.event_type, event.event_version, event.payload, event.attempts,
       event.max_attempts, event.correlation_id, event.causation_id, event.occurred_at`,
    [input.batchSize, input.workerId, input.leaseMs],
  );
  return result.rows;
}

async function alreadyConsumed(eventId: string, consumerName: string) {
  const result = await pool.query(
    "SELECT 1 FROM event_consumptions WHERE event_id = $1::uuid AND consumer_name = $2 LIMIT 1",
    [eventId, consumerName],
  );
  return result.rowCount === 1;
}

async function markSkipped(input: {
  event: DomainEvent;
  workerId: string;
  jobRunId: string;
  consumerName: string;
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE outbox_events
       SET status = 'COMPLETED', processed_at = COALESCE(processed_at, now()),
           locked_at = NULL, locked_by = NULL, updated_at = now()
       WHERE id = $1::uuid AND locked_by = $2
       RETURNING id`,
      [input.event.id, input.workerId],
    );
    if (updated.rowCount !== 1) throw new Error("OUTBOX_LEASE_LOST");
    await client.query(
      `INSERT INTO job_attempts (job_run_id, outbox_event_id, attempt_number, status, error_message)
       VALUES ($1::uuid, $2::uuid, $3, 'SKIPPED', $4)`,
      [input.jobRunId, input.event.id, input.event.attempts, `Sudah diproses consumer ${input.consumerName}`],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function markSucceeded(input: {
  event: DomainEvent;
  workerId: string;
  jobRunId: string;
  consumerName: string;
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE outbox_events
       SET status = 'COMPLETED', processed_at = now(), locked_at = NULL,
           locked_by = NULL, last_error = NULL, updated_at = now()
       WHERE id = $1::uuid AND locked_by = $2
       RETURNING id`,
      [input.event.id, input.workerId],
    );
    if (updated.rowCount !== 1) throw new Error("OUTBOX_LEASE_LOST");
    await client.query(
      `INSERT INTO event_consumptions (event_id, consumer_name, result)
       VALUES ($1::uuid, $2, $3::jsonb)
       ON CONFLICT (event_id, consumer_name) DO NOTHING`,
      [input.event.id, input.consumerName, JSON.stringify({ status: "SUCCEEDED" })],
    );
    await client.query(
      `INSERT INTO job_attempts (job_run_id, outbox_event_id, attempt_number, status)
       VALUES ($1::uuid, $2::uuid, $3, 'SUCCEEDED')`,
      [input.jobRunId, input.event.id, input.event.attempts],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function markFailed(input: {
  event: DomainEvent;
  workerId: string;
  jobRunId: string;
  error: unknown;
}) {
  const message = errorMessage(input.error);
  const deadLettered = input.event.attempts >= input.event.maxAttempts;
  const retryAt = new Date(Date.now() + outboxRetryDelayMs(input.event.attempts));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE outbox_events
       SET status = $3::outbox_event_status,
           available_at = CASE WHEN $3 = 'RETRY' THEN $4 ELSE available_at END,
           locked_at = NULL, locked_by = NULL, last_error = $5, updated_at = now()
       WHERE id = $1::uuid AND locked_by = $2
       RETURNING id`,
      [input.event.id, input.workerId, deadLettered ? "DEAD_LETTER" : "RETRY", retryAt, message],
    );
    if (updated.rowCount !== 1) throw new Error("OUTBOX_LEASE_LOST");
    await client.query(
      `INSERT INTO job_attempts (job_run_id, outbox_event_id, attempt_number, status, error_message)
       VALUES ($1::uuid, $2::uuid, $3, 'FAILED', $4)`,
      [input.jobRunId, input.event.id, input.event.attempts, message],
    );
    if (deadLettered) {
      await client.query(
        `INSERT INTO dead_letter_events (outbox_event_id, reason, payload_snapshot)
         VALUES ($1::uuid, $2, $3::jsonb)
         ON CONFLICT (outbox_event_id) DO UPDATE
         SET reason = excluded.reason, payload_snapshot = excluded.payload_snapshot, failed_at = now(),
             replayed_at = NULL, replayed_by = NULL`,
        [input.event.id, message, JSON.stringify({
          eventType: input.event.eventType,
          eventVersion: input.event.eventVersion,
          aggregateType: input.event.aggregateType,
          aggregateId: input.event.aggregateId,
          payload: input.event.payload,
          correlationId: input.event.correlationId,
        })],
      );
    }
    await client.query("COMMIT");
    return deadLettered;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function runOutboxWorkerOnce(options: OutboxWorkerOptions = {}): Promise<OutboxWorkerResult> {
  const workerId = options.workerId ?? `outbox-${process.pid}-${randomUUID().slice(0, 8)}`;
  const consumerName = options.consumerName ?? "rizqhub-core-v1";
  const batchSize = boundedInteger(options.batchSize, 20, 1, 100);
  const leaseMs = boundedInteger(options.leaseMs, 5 * 60_000, 30_000, 60 * 60_000);
  const resolveHandler = options.resolveHandler ?? resolveDomainEventHandler;
  const claimed = await claimEvents({ workerId, batchSize, leaseMs });
  if (claimed.length === 0) {
    return Object.freeze({ jobRunId: null, workerId, claimed: 0, succeeded: 0, failed: 0, deadLettered: 0 });
  }

  const correlationId = randomUUID();
  const jobRunId = randomUUID();
  await pool.query(
    `INSERT INTO job_runs (id, job_name, worker_id, status, correlation_id, claimed_count, metadata)
     VALUES ($1::uuid, 'outbox.dispatch', $2, 'RUNNING', $3, $4, $5::jsonb)`,
    [jobRunId, workerId, correlationId, claimed.length, JSON.stringify({ batchSize, leaseMs, consumerName })],
  );

  let succeeded = 0;
  let failed = 0;
  let deadLettered = 0;
  try {
    for (const row of claimed) {
      const event = domainEvent(row);
      try {
        if (await alreadyConsumed(event.id, consumerName)) {
          await markSkipped({ event, workerId, jobRunId, consumerName });
          succeeded += 1;
          continue;
        }
        const handler = resolveHandler(event.eventType);
        if (!handler) throw new Error(`NO_HANDLER:${event.eventType}`);
        await handler(event);
        await markSucceeded({ event, workerId, jobRunId, consumerName });
        succeeded += 1;
        structuredLog("info", "outbox_event_processed", {
          event_id: event.id,
          event_type: event.eventType,
          correlation_id: event.correlationId,
          worker_id: workerId,
          attempt: event.attempts,
        });
      } catch (error) {
        const movedToDeadLetter = await markFailed({ event, workerId, jobRunId, error });
        failed += 1;
        if (movedToDeadLetter) deadLettered += 1;
        structuredLog("error", "outbox_event_failed", {
          event_id: event.id,
          event_type: event.eventType,
          correlation_id: event.correlationId,
          worker_id: workerId,
          attempt: event.attempts,
          dead_lettered: movedToDeadLetter,
          error: errorMessage(error),
        });
      }
    }

    const status = failed === 0 ? "SUCCEEDED" : succeeded === 0 ? "FAILED" : "PARTIAL";
    await pool.query(
      `UPDATE job_runs SET status = $2::job_run_status, succeeded_count = $3,
       failed_count = $4, finished_at = now() WHERE id = $1::uuid`,
      [jobRunId, status, succeeded, failed],
    );
  } catch (error) {
    await pool.query(
      `UPDATE job_runs SET status = 'FAILED', error_message = $2, finished_at = now()
       WHERE id = $1::uuid`,
      [jobRunId, errorMessage(error)],
    ).catch(() => undefined);
    throw error;
  }

  return Object.freeze({ jobRunId, workerId, claimed: claimed.length, succeeded, failed, deadLettered });
}

export async function replayDeadLetterEvent(input: { eventId: string; actorId?: string | null }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE outbox_events
       SET status = 'PENDING', attempts = 0, available_at = now(), locked_at = NULL,
           locked_by = NULL, last_error = NULL, processed_at = NULL, updated_at = now()
       WHERE id = $1::uuid AND status = 'DEAD_LETTER'
       RETURNING id`,
      [input.eventId],
    );
    if (result.rowCount !== 1) throw new Error("DEAD_LETTER_EVENT_NOT_FOUND");
    await client.query(
      `UPDATE dead_letter_events SET replayed_at = now(), replayed_by = $2::uuid
       WHERE outbox_event_id = $1::uuid`,
      [input.eventId, input.actorId ?? null],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
