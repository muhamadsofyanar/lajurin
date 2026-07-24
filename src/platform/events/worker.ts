import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import { eventConsumptions, jobAttempts, jobRuns } from "@/lib/schema";
import { handleOutboxEvent, OUTBOX_CONSUMER_NAME, type OutboxHandlerEvent } from "./handlers";

const WORKER_NAME = "outbox-worker-v1";
const STALE_LOCK_MINUTES = 5;

type ClaimedEvent = OutboxHandlerEvent & Readonly<{
  attemptCount: number;
  maxAttempts: number;
}>;

async function controlPlaneTransaction<T>(operation: (client: import("pg").PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.control_plane', 'on', true)");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export function outboxRetryDelaySeconds(attemptCount: number) {
  return Math.min(3600, 30 * (2 ** Math.max(0, attemptCount - 1)));
}

async function claimEvents(limit: number, workerId: string) {
  return controlPlaneTransaction(async (client) => {
    await client.query(
      `UPDATE outbox_events
       SET status = 'RETRY', locked_at = NULL, locked_by = NULL,
           last_error = COALESCE(last_error, 'Worker lock kedaluwarsa'), updated_at = now()
       WHERE status = 'PROCESSING'
         AND locked_at < now() - ($1::text || ' minutes')::interval`,
      [STALE_LOCK_MINUTES],
    );
    const result = await client.query<{
      id: string;
      event_name: string;
      event_version: number;
      workspace_id: string;
      correlation_id: string;
      payload: Record<string, unknown>;
      attempt_count: number;
      max_attempts: number;
    }>(
      `WITH candidates AS (
         SELECT id
         FROM outbox_events
         WHERE status IN ('PENDING', 'RETRY') AND available_at <= now()
         ORDER BY available_at, occurred_at
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE outbox_events AS event
       SET status = 'PROCESSING', locked_at = now(), locked_by = $2,
           attempt_count = event.attempt_count + 1, updated_at = now()
       FROM candidates
       WHERE event.id = candidates.id
       RETURNING event.id, event.event_name, event.event_version, event.workspace_id,
                 event.correlation_id, event.payload, event.attempt_count, event.max_attempts`,
      [limit, workerId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      eventName: row.event_name,
      eventVersion: row.event_version,
      workspaceId: row.workspace_id,
      correlationId: row.correlation_id,
      payload: row.payload,
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
    })) satisfies ClaimedEvent[];
  });
}

async function beginConsumption(event: ClaimedEvent) {
  const [consumption] = await db.insert(eventConsumptions).values({
    eventId: event.id,
    workspaceId: event.workspaceId,
    consumerName: OUTBOX_CONSUMER_NAME,
  }).onConflictDoNothing({
    target: [eventConsumptions.consumerName, eventConsumptions.eventId],
  }).returning({ id: eventConsumptions.id });
  if (consumption) return { process: true, consumptionId: consumption.id };

  const [existing] = await db.select({
    id: eventConsumptions.id,
    status: eventConsumptions.status,
  }).from(eventConsumptions).where(and(
    eq(eventConsumptions.consumerName, OUTBOX_CONSUMER_NAME),
    eq(eventConsumptions.eventId, event.id),
  )).limit(1);
  if (!existing) throw new Error("Status konsumsi event tidak tersedia");
  if (existing.status === "PROCESSED") return { process: false, consumptionId: existing.id };

  await db.update(eventConsumptions).set({
    status: "PROCESSING",
    attemptCount: sql`${eventConsumptions.attemptCount} + 1`,
    lastError: null,
    updatedAt: new Date(),
  }).where(eq(eventConsumptions.id, existing.id));
  return { process: true, consumptionId: existing.id };
}

async function markProcessed(event: ClaimedEvent, consumptionId: string, attemptId: string) {
  await controlPlaneTransaction(async (client) => {
    await client.query(
      `UPDATE event_consumptions
       SET status = 'PROCESSED', last_error = NULL, processed_at = now(), updated_at = now()
       WHERE id = $1`,
      [consumptionId],
    );
    await client.query(
      `UPDATE outbox_events
       SET status = 'PROCESSED', locked_at = NULL, locked_by = NULL,
           last_error = NULL, processed_at = now(), updated_at = now()
       WHERE id = $1`,
      [event.id],
    );
    await client.query(
      `UPDATE job_attempts SET status = 'SUCCEEDED', finished_at = now() WHERE id = $1`,
      [attemptId],
    );
  });
}

async function markFailed(event: ClaimedEvent, consumptionId: string, attemptId: string, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown outbox error";
  const terminal = event.attemptCount >= event.maxAttempts;
  const delaySeconds = outboxRetryDelaySeconds(event.attemptCount);

  await controlPlaneTransaction(async (client) => {
    await client.query(
      `UPDATE event_consumptions
       SET status = 'FAILED', last_error = $2, updated_at = now()
       WHERE id = $1`,
      [consumptionId, message],
    );
    await client.query(
      `UPDATE job_attempts
       SET status = 'FAILED', error_message = $2, finished_at = now()
       WHERE id = $1`,
      [attemptId, message],
    );
    if (terminal) {
      await client.query(
        `UPDATE outbox_events
         SET status = 'DEAD', locked_at = NULL, locked_by = NULL,
             last_error = $2, updated_at = now()
         WHERE id = $1`,
        [event.id, message],
      );
      await client.query(
        `INSERT INTO dead_letter_events (
           event_id, workspace_id, event_name, payload, attempt_count, last_error
         ) VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         ON CONFLICT (event_id) DO UPDATE SET
           attempt_count = EXCLUDED.attempt_count,
           last_error = EXCLUDED.last_error,
           failed_at = now(),
           replayed_at = NULL,
           replayed_by = NULL`,
        [event.id, event.workspaceId, event.eventName, JSON.stringify(event.payload), event.attemptCount, message],
      );
    } else {
      await client.query(
        `UPDATE outbox_events
         SET status = 'RETRY', available_at = now() + ($2::text || ' seconds')::interval,
             locked_at = NULL, locked_by = NULL, last_error = $3, updated_at = now()
         WHERE id = $1`,
        [event.id, delaySeconds, message],
      );
    }
  });
  return terminal;
}

export async function runOutboxWorker(input: {
  limit?: number;
  correlationId?: string;
  requestedBy?: string;
} = {}) {
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const workerId = `${WORKER_NAME}:${randomUUID()}`;
  const correlationId = input.correlationId ?? randomUUID();
  const [run] = await db.insert(jobRuns).values({
    workerName: WORKER_NAME,
    correlationId,
    requestedBy: input.requestedBy ?? null,
    metadata: { limit, workerId },
  }).returning();

  let claimed: ClaimedEvent[] = [];
  let processed = 0;
  let failed = 0;
  let dead = 0;
  try {
    claimed = await claimEvents(limit, workerId);
    await db.update(jobRuns).set({ claimedCount: claimed.length }).where(eq(jobRuns.id, run.id));
    for (const event of claimed) {
      const consumption = await beginConsumption(event);
      const [attempt] = await db.insert(jobAttempts).values({
        jobRunId: run.id,
        eventId: event.id,
        attemptNumber: event.attemptCount,
      }).returning({ id: jobAttempts.id });
      try {
        if (consumption.process) await handleOutboxEvent(event);
        await markProcessed(event, consumption.consumptionId, attempt.id);
        processed += 1;
      } catch (error) {
        if (await markFailed(event, consumption.consumptionId, attempt.id, error)) dead += 1;
        failed += 1;
      }
    }
    const status = failed === 0 ? "SUCCEEDED" : processed > 0 ? "PARTIAL" : "FAILED";
    await db.update(jobRuns).set({
      status,
      processedCount: processed,
      failedCount: failed,
      finishedAt: new Date(),
    }).where(eq(jobRuns.id, run.id));
    return { runId: run.id, claimed: claimed.length, processed, failed, dead };
  } catch (error) {
    await db.update(jobRuns).set({
      status: "FAILED",
      claimedCount: claimed.length,
      processedCount: processed,
      failedCount: Math.max(1, failed),
      finishedAt: new Date(),
      metadata: {
        limit,
        workerId,
        fatalError: error instanceof Error ? error.message.slice(0, 500) : "Unknown worker error",
      },
    }).where(eq(jobRuns.id, run.id)).catch(() => undefined);
    throw error;
  }
}

export async function replayDeadLetterEvent(eventId: string, replayedBy: string) {
  return controlPlaneTransaction(async (client) => {
    const deadLetter = await client.query<{ event_id: string }>(
      `SELECT event_id FROM dead_letter_events WHERE event_id = $1 FOR UPDATE`,
      [eventId],
    );
    if (!deadLetter.rowCount) return false;
    const updated = await client.query(
      `UPDATE outbox_events
       SET status = 'RETRY', available_at = now(), max_attempts = LEAST(20, max_attempts + 5),
           locked_at = NULL, locked_by = NULL, last_error = NULL, updated_at = now()
       WHERE id = $1 AND status = 'DEAD'
       RETURNING id`,
      [eventId],
    );
    if (!updated.rowCount) return false;
    await client.query(
      `UPDATE dead_letter_events SET replayed_at = now(), replayed_by = $2 WHERE event_id = $1`,
      [eventId, replayedBy],
    );
    return true;
  });
}

export async function outboxOperationalCounts() {
  return controlPlaneTransaction(async (client) => {
    const result = await client.query<{ status: "PENDING" | "RETRY" | "DEAD"; value: number }>(
      `SELECT status, count(*)::int AS value
       FROM outbox_events
       WHERE status IN ('PENDING', 'RETRY', 'DEAD')
       GROUP BY status`,
    );
    return Object.fromEntries(result.rows.map((row) => [row.status, row.value])) as Partial<Record<"PENDING" | "RETRY" | "DEAD", number>>;
  });
}
