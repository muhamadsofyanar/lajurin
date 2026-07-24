import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { correlationContextFromHeaders } from "../src/platform/observability/context";
import { enforcePolicy, evaluatePolicy, PolicyDeniedError, type PolicyRule } from "../src/platform/policy/engine";
import { outboxRetryDelayMs } from "../src/platform/jobs/retry-policy";

const read = (path: string) => readFileSync(path, "utf8");

test("correlation context meneruskan ID aman dan menolak header berbahaya", () => {
  const safe = correlationContextFromHeaders(new Headers({
    "x-request-id": "req-123",
    "x-correlation-id": "corr-123",
    "x-trace-id": "trace-123",
  }));
  assert.deepEqual(safe, { requestId: "req-123", correlationId: "corr-123", traceId: "trace-123" });

  const unsafe = correlationContextFromHeaders(new Headers({ "x-request-id": "bad value" }));
  assert.notEqual(unsafe.requestId, "bad value");
  assert.match(unsafe.requestId, /^[0-9a-f-]{36}$/i);
});

test("policy engine menghasilkan keputusan konsisten", () => {
  const rule: PolicyRule<{ role: string }, { ownerId: string; actorId: string }> = {
    name: "resource.manage",
    evaluate: (context, resource) => context.role === "ADMIN" || resource.ownerId === resource.actorId,
  };
  assert.equal(evaluatePolicy(rule, { role: "MEMBER" }, { ownerId: "u1", actorId: "u1" }).allowed, true);
  assert.throws(
    () => enforcePolicy(rule, { role: "MEMBER" }, { ownerId: "u1", actorId: "u2" }),
    PolicyDeniedError,
  );
});

test("retry outbox memakai exponential backoff berbatas", () => {
  assert.equal(outboxRetryDelayMs(1), 1_000);
  assert.equal(outboxRetryDelayMs(2), 2_000);
  assert.equal(outboxRetryDelayMs(10), 512_000);
  assert.equal(outboxRetryDelayMs(100), 900_000);
});

test("v5 platform kernel memiliki migration, worker, endpoint, dan observability", () => {
  assert.ok(existsSync("drizzle/0026_v500_platform_kernel.sql"));
  assert.ok(existsSync("src/platform/jobs/outbox-worker.ts"));
  assert.ok(existsSync("src/app/api/jobs/outbox/route.ts"));
  assert.match(read("src/lib/schema.ts"), /outboxEvents/);
  assert.match(read("src/lib/schema.ts"), /deadLetterEvents/);
  assert.match(read("src/proxy.ts"), /correlationHeaders/);
  assert.match(read("src/platform/observability/context.ts"), /"x-correlation-id"/);
});

test("efek eksternal alur pembayaran kritis diarahkan ke transactional outbox", () => {
  const checkout = read("src/app/actions/checkout.ts");
  const manualPayment = read("src/app/actions/payment.ts");
  const webhook = read("src/app/api/xendit/webhook/route.ts");
  assert.match(checkout, /enqueueDomainEvent\(tx/);
  assert.match(manualPayment, /enqueueDomainEvent\(tx/);
  assert.match(webhook, /enqueueDomainEvent\(tx/);
  assert.doesNotMatch(manualPayment, /dispatchOrderNotifications/);
  assert.doesNotMatch(webhook, /dispatchMerchantAutomations/);
});
