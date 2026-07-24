import { randomUUID } from "node:crypto";
import { sql, type SQL } from "drizzle-orm";
import type { EnqueueDomainEventInput } from "./types";

export type SqlExecutor = Readonly<{
  execute(query: SQL): unknown;
}>;

function positiveInteger(value: number | undefined, fallback: number) {
  return Number.isInteger(value) && (value ?? 0) > 0 ? value! : fallback;
}

export async function enqueueDomainEvent(
  executor: SqlExecutor,
  input: EnqueueDomainEventInput,
) {
  const eventId = input.id ?? randomUUID();
  const eventVersion = positiveInteger(input.eventVersion, 1);
  const maxAttempts = positiveInteger(input.maxAttempts, 8);
  const payload = JSON.stringify(input.payload);

  await executor.execute(sql`
    INSERT INTO outbox_events (
      id, workspace_id, aggregate_type, aggregate_id, event_type, event_version,
      payload, status, attempts, max_attempts, available_at, correlation_id,
      causation_id, deduplication_key, occurred_at, created_at, updated_at
    ) VALUES (
      ${eventId}::uuid,
      ${input.workspaceId ?? null}::uuid,
      ${input.aggregateType},
      ${input.aggregateId},
      ${input.eventType},
      ${eventVersion},
      ${payload}::jsonb,
      'PENDING',
      0,
      ${maxAttempts},
      ${input.availableAt ?? new Date()},
      ${input.correlationId},
      ${input.causationId ?? null},
      ${input.deduplicationKey ?? null},
      now(),
      now(),
      now()
    )
    ON CONFLICT (event_type, deduplication_key) DO NOTHING
  `);

  return eventId;
}

export function orderNotificationEvent(input: {
  orderId: string;
  notificationEvent: "ORDER_CREATED" | "PAYMENT_APPROVED" | "PAYMENT_REJECTED" | "CHECKOUT_REMINDER";
  correlationId: string;
  workspaceId?: string | null;
}) {
  return {
    workspaceId: input.workspaceId ?? null,
    aggregateType: "ORDER",
    aggregateId: input.orderId,
    eventType: "notification.order.v1",
    eventVersion: 1,
    payload: { orderId: input.orderId, notificationEvent: input.notificationEvent },
    correlationId: input.correlationId,
    deduplicationKey: `${input.orderId}:${input.notificationEvent}`,
  } as const;
}

export function merchantAutomationEvent(input: {
  sourceId: string;
  trigger: "PURCHASED" | "COURSE_COMPLETED";
  correlationId: string;
  workspaceId?: string | null;
}) {
  return {
    workspaceId: input.workspaceId ?? null,
    aggregateType: "AUTOMATION_SOURCE",
    aggregateId: input.sourceId,
    eventType: "automation.merchant.v1",
    eventVersion: 1,
    payload: { sourceId: input.sourceId, trigger: input.trigger },
    correlationId: input.correlationId,
    deduplicationKey: `${input.sourceId}:${input.trigger}`,
  } as const;
}
