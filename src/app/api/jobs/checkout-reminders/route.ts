import { timingSafeEqual } from "node:crypto";
import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";
import { enqueueDomainEvent, orderNotificationEvent } from "@/platform/events/outbox";
import { correlationContextFromHeaders } from "@/platform/observability/context";

function tokenMatches(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!tokenMatches(token, process.env.INTERNAL_JOB_SECRET)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const threshold = new Date(Date.now() - 60 * 60_000);
  const rows = await db.select({ id: orders.id }).from(orders).where(and(
    inArray(orders.status, ["PENDING", "AWAITING_CONFIRMATION"]),
    eq(orders.marketingConsent, true),
    lte(orders.createdAt, threshold),
  )).limit(100);
  const context = correlationContextFromHeaders(request.headers);
  await db.transaction(async (tx) => {
    for (const row of rows) {
      await enqueueDomainEvent(tx, orderNotificationEvent({
        orderId: row.id,
        notificationEvent: "CHECKOUT_REMINDER",
        correlationId: context.correlationId,
      }));
    }
  });
  return Response.json({ ok: true, queued: rows.length, requestId: context.requestId }, {
    headers: { "cache-control": "no-store", "x-request-id": context.requestId },
  });
}
