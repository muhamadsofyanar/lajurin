import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { supportedEventNames } from "../src/platform/events/handlers";
import { outboxRetryDelaySeconds } from "../src/platform/events/worker";

test("outbox memakai exponential backoff dengan batas satu jam", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5, 10].map(outboxRetryDelaySeconds),
    [30, 60, 120, 240, 480, 3600],
  );
});

test("registry event v5 hanya membuka handler yang eksplisit", () => {
  assert.deepEqual(supportedEventNames().sort(), ["order.paid.v1", "payment.rejected.v1"]);
});

test("payment critical path menulis outbox sebelum side effect eksternal", async () => {
  const [webhook, payment] = await Promise.all([
    readFile("src/app/api/xendit/webhook/route.ts", "utf8"),
    readFile("src/app/actions/payment.ts", "utf8"),
  ]);
  for (const source of [webhook, payment]) {
    assert.match(source, /publishOrderPaidEvent\(tx,/);
    assert.match(source, /OUTBOX_PROCESSING_ENABLED !== "true"/);
  }
});

test("migration v5 menambah workspace scope, outbox, retry, dead letter, dan RLS pilot", async () => {
  const migration = await readFile("drizzle/0026_v5_platform_kernel.sql", "utf8");
  for (const requirement of [
    /ALTER TABLE "products" ADD COLUMN "workspace_id"/,
    /ALTER TABLE "orders" ADD COLUMN "workspace_id"/,
    /CREATE TABLE "outbox_events"/,
    /CREATE TABLE "event_consumptions"/,
    /CREATE TABLE "job_runs"/,
    /CREATE TABLE "job_attempts"/,
    /CREATE TABLE "dead_letter_events"/,
    /FORCE ROW LEVEL SECURITY/,
    /outbox_events_workspace_policy/,
  ]) assert.match(migration, requirement);
});
