import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/lib/db";
import { eventConsumptions, jobRuns, outboxEvents } from "../src/lib/schema";
import { enqueueDomainEvent } from "../src/platform/events/outbox";
import { runOutboxWorkerOnce } from "../src/platform/jobs/outbox-worker";

const enabled = process.env.RUN_DATABASE_TESTS === "true";

test("outbox menjaga deduplikasi dan konsumsi idempoten", { skip: !enabled }, async () => {
  const aggregateId = randomUUID();
  const correlationId = randomUUID();
  const deduplicationKey = `test:${aggregateId}`;
  let handled = 0;
  let jobRunId: string | null = null;

  try {
    const input = {
      aggregateType: "TEST",
      aggregateId,
      eventType: "test.kernel.v1",
      payload: { aggregateId },
      correlationId,
      deduplicationKey,
    } as const;
    await enqueueDomainEvent(db, input);
    await enqueueDomainEvent(db, input);

    const queued = await db.select().from(outboxEvents).where(eq(outboxEvents.deduplicationKey, deduplicationKey));
    assert.equal(queued.length, 1);

    const result = await runOutboxWorkerOnce({
      workerId: `test-${aggregateId}`,
      consumerName: "kernel-test",
      batchSize: 1,
      resolveHandler: (eventType) => eventType === "test.kernel.v1" ? async () => { handled += 1; } : null,
    });
    jobRunId = result.jobRunId;
    assert.equal(result.succeeded, 1);
    assert.equal(handled, 1);

    const [processed] = await db.select().from(outboxEvents).where(eq(outboxEvents.deduplicationKey, deduplicationKey));
    assert.equal(processed.status, "COMPLETED");
    const consumptions = await db.select().from(eventConsumptions).where(eq(eventConsumptions.eventId, processed.id));
    assert.equal(consumptions.length, 1);
  } finally {
    if (jobRunId) await db.delete(jobRuns).where(eq(jobRuns.id, jobRunId));
    await db.delete(outboxEvents).where(eq(outboxEvents.deduplicationKey, deduplicationKey));
    await pool.end();
  }
});
