import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { AppTransaction } from "@/lib/finance";
import { legacyMerchantWorkspaceLinks, orders, outboxEvents, products } from "@/lib/schema";

export type DomainEventInput = Readonly<{
  eventName: string;
  eventVersion?: number;
  workspaceId: string;
  actorId?: string | null;
  subjectType: string;
  subjectId: string;
  correlationId?: string;
  causationId?: string | null;
  payload?: Record<string, unknown>;
  availableAt?: Date;
  maxAttempts?: number;
}>;

export async function setWorkspaceTransactionScope(tx: AppTransaction, workspaceId: string) {
  await tx.execute(sql`select set_config('app.workspace_id', ${workspaceId}, true)`);
}

export async function ensureOrderWorkspaceId(tx: AppTransaction, orderId: string) {
  const [row] = await tx.select({
    productId: orders.productId,
    orderWorkspaceId: orders.workspaceId,
    productWorkspaceId: products.workspaceId,
    linkedWorkspaceId: legacyMerchantWorkspaceLinks.workspaceId,
  }).from(orders)
    .innerJoin(products, eq(products.id, orders.productId))
    .leftJoin(legacyMerchantWorkspaceLinks, eq(legacyMerchantWorkspaceLinks.legacyMerchantUserId, products.merchantId))
    .where(eq(orders.id, orderId))
    .limit(1);

  const workspaceId = row?.orderWorkspaceId ?? row?.productWorkspaceId ?? row?.linkedWorkspaceId;
  if (!workspaceId) throw new Error("Workspace order belum tersedia");

  if (!row.orderWorkspaceId) {
    await tx.update(orders).set({ workspaceId, updatedAt: new Date() }).where(eq(orders.id, orderId));
  }
  if (!row.productWorkspaceId) {
    await tx.update(products).set({ workspaceId, updatedAt: new Date() }).where(eq(products.id, row.productId));
  }
  return workspaceId;
}

export async function publishOutboxEvent(tx: AppTransaction, input: DomainEventInput) {
  if (!/^[a-z][a-z0-9_.-]+\.v[1-9][0-9]*$/.test(input.eventName)) {
    throw new Error(`Nama event tidak valid: ${input.eventName}`);
  }
  const eventVersion = input.eventVersion ?? Number(input.eventName.match(/\.v([0-9]+)$/)?.[1] ?? 1);
  const correlationId = input.correlationId ?? randomUUID();
  await setWorkspaceTransactionScope(tx, input.workspaceId);
  const [event] = await tx.insert(outboxEvents).values({
    eventName: input.eventName,
    eventVersion,
    workspaceId: input.workspaceId,
    actorId: input.actorId ?? null,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    correlationId,
    causationId: input.causationId ?? null,
    payload: input.payload ?? {},
    availableAt: input.availableAt ?? new Date(),
    maxAttempts: input.maxAttempts ?? 5,
  }).returning();
  return event;
}

export async function publishOrderPaidEvent(tx: AppTransaction, input: {
  orderId: string;
  actorId?: string | null;
  correlationId?: string;
  causationId?: string | null;
}) {
  const workspaceId = await ensureOrderWorkspaceId(tx, input.orderId);
  return publishOutboxEvent(tx, {
    eventName: "order.paid.v1",
    workspaceId,
    actorId: input.actorId,
    subjectType: "ORDER",
    subjectId: input.orderId,
    correlationId: input.correlationId,
    causationId: input.causationId,
    payload: { orderId: input.orderId },
  });
}

export async function publishPaymentRejectedEvent(tx: AppTransaction, input: {
  orderId: string;
  actorId: string;
  correlationId?: string;
}) {
  const workspaceId = await ensureOrderWorkspaceId(tx, input.orderId);
  return publishOutboxEvent(tx, {
    eventName: "payment.rejected.v1",
    workspaceId,
    actorId: input.actorId,
    subjectType: "ORDER",
    subjectId: input.orderId,
    correlationId: input.correlationId,
    payload: { orderId: input.orderId },
  });
}
