import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { recordPaidOrderAccounting } from "@/lib/finance";
import { fulfillPaidOrder } from "@/lib/funnel";
import { dispatchOrderNotifications } from "@/lib/notifications";
import { dispatchMerchantAutomations } from "@/lib/automation";
import { orders, webhookEvents } from "@/lib/schema";
import { logEvent, requestIdFromHeaders } from "@/lib/security";

const MAX_WEBHOOK_BYTES = 64 * 1024;
const webhookSchema = z.object({
  event: z.enum(["payment_session.completed", "payment_session.expired"]),
  created: z.string().datetime(),
  data: z.object({
    payment_session_id: z.string().min(1).max(200),
    reference_id: z.string().min(1).max(200),
    session_type: z.literal("PAY"),
    amount: z.number().int().nonnegative(),
    currency: z.literal("IDR"),
    status: z.enum(["COMPLETED", "EXPIRED"]),
    payment_id: z.string().max(200).optional(),
  }),
});

function tokenMatches(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function jsonResponse(body: unknown, status: number, requestId: string) {
  return Response.json(body, { status, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  if (!tokenMatches(request.headers.get("x-callback-token"), process.env.XENDIT_WEBHOOK_TOKEN)) {
    logEvent("warn", "xendit_webhook_unauthorized", { requestId });
    return jsonResponse({ error: "Unauthorized" }, 401, requestId);
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_WEBHOOK_BYTES) return jsonResponse({ error: "Payload too large" }, 413, requestId);
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody) > MAX_WEBHOOK_BYTES) return jsonResponse({ error: "Payload too large" }, 413, requestId);
  const fingerprint = createHash("sha256").update(rawBody).digest("hex");

  let unknownPayload: unknown;
  try { unknownPayload = JSON.parse(rawBody); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, requestId); }

  const parsed = webhookSchema.safeParse(unknownPayload);
  const eventName = parsed.success ? parsed.data.event : null;
  const externalId = parsed.success ? parsed.data.data.reference_id : null;
  const [created] = await db.insert(webhookEvents).values({
    fingerprint, requestId, eventName, externalId, payload: unknownPayload,
    status: parsed.success ? "RECEIVED" : "REJECTED",
    responseStatus: parsed.success ? null : 422,
    errorMessage: parsed.success ? null : "Payload schema tidak valid",
    processedAt: parsed.success ? null : new Date(),
  }).onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.fingerprint] }).returning();

  let eventRecord = created;
  if (!eventRecord) {
    [eventRecord] = await db.select().from(webhookEvents).where(and(eq(webhookEvents.provider, "XENDIT"), eq(webhookEvents.fingerprint, fingerprint))).limit(1);
    if (!eventRecord) return jsonResponse({ error: "Webhook log unavailable" }, 503, requestId);
    if (["PROCESSED", "IGNORED", "REJECTED"].includes(eventRecord.status)) {
      return jsonResponse({ received: true, duplicate: true }, 200, requestId);
    }
    if (eventRecord.status === "RECEIVED" && eventRecord.updatedAt > new Date(Date.now() - 5 * 60_000)) {
      return jsonResponse({ error: "Webhook is being processed" }, 503, requestId);
    }
    await db.update(webhookEvents).set({ status: "RECEIVED", requestId, errorMessage: null, responseStatus: null, updatedAt: new Date() })
      .where(eq(webhookEvents.id, eventRecord.id));
  }

  if (!parsed.success) return jsonResponse({ error: "Invalid payload" }, 422, requestId);
  const payload = parsed.data;

  try {
    const [row] = await db.select({ order: orders }).from(orders).where(eq(orders.externalId, payload.data.reference_id)).limit(1);
    if (!row || row.order.xenditSessionId !== payload.data.payment_session_id) {
      await db.update(webhookEvents).set({ status: "FAILED", responseStatus: 404, errorMessage: "Order atau payment session belum ditemukan", updatedAt: new Date() }).where(eq(webhookEvents.id, eventRecord.id));
      return jsonResponse({ error: "Order not found" }, 404, requestId);
    }
    await db.update(webhookEvents).set({ orderId: row.order.id, updatedAt: new Date() }).where(eq(webhookEvents.id, eventRecord.id));

    if (payload.event === "payment_session.completed") {
      if (payload.data.status !== "COMPLETED" || payload.data.amount !== row.order.amount || !row.order.customerId) {
        await db.update(webhookEvents).set({ status: "REJECTED", responseStatus: 422, errorMessage: "Status, nominal, atau customer tidak sesuai", processedAt: new Date(), updatedAt: new Date() }).where(eq(webhookEvents.id, eventRecord.id));
        return jsonResponse({ error: "Payment amount mismatch" }, 422, requestId);
      }
      const applied = await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`order:${row.order.id}`}))`);
        const [current] = await tx.select({ status: orders.status }).from(orders).where(eq(orders.id, row.order.id)).limit(1);
        if (!current || current.status === "PAID" || current.status === "REFUNDED") return false;
        await tx.update(orders).set({
          status: "PAID", paidAt: new Date(payload.created), xenditPaymentId: payload.data.payment_id,
          webhookPayload: payload, updatedAt: new Date(),
        }).where(eq(orders.id, row.order.id));
        await fulfillPaidOrder(tx, row.order.id);
        await recordPaidOrderAccounting(tx, row.order.id);
        return true;
      });
      if (!applied) {
        await db.update(webhookEvents).set({ status: "IGNORED", responseStatus: 200, errorMessage: "Order sudah diproses atau direfund", processedAt: new Date(), updatedAt: new Date() }).where(eq(webhookEvents.id, eventRecord.id));
        return jsonResponse({ received: true, ignored: true }, 200, requestId);
      }
      await dispatchOrderNotifications(row.order.id, "PAYMENT_APPROVED");
      await dispatchMerchantAutomations("PURCHASED", row.order.id);
    } else if (payload.data.status !== "EXPIRED") {
      await db.update(webhookEvents).set({ status: "REJECTED", responseStatus: 422, errorMessage: "Status event expired tidak sesuai", processedAt: new Date(), updatedAt: new Date() }).where(eq(webhookEvents.id, eventRecord.id));
      return jsonResponse({ error: "Payment status mismatch" }, 422, requestId);
    } else {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`order:${row.order.id}`}))`);
        const [current] = await tx.select({ status: orders.status }).from(orders).where(eq(orders.id, row.order.id)).limit(1);
        if (current && current.status !== "PAID" && current.status !== "REFUNDED") {
          await tx.update(orders).set({ status: "EXPIRED", webhookPayload: payload, updatedAt: new Date() }).where(eq(orders.id, row.order.id));
        }
      });
    }

    await db.update(webhookEvents).set({ status: "PROCESSED", responseStatus: 200, processedAt: new Date(), updatedAt: new Date() }).where(eq(webhookEvents.id, eventRecord.id));
    logEvent("info", "xendit_webhook_processed", { requestId, event: payload.event, orderId: row.order.id });
    return jsonResponse({ received: true }, 200, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown webhook error";
    await db.update(webhookEvents).set({ status: "FAILED", responseStatus: 500, errorMessage: message, updatedAt: new Date() })
      .where(eq(webhookEvents.id, eventRecord.id)).catch(() => undefined);
    logEvent("error", "xendit_webhook_failed", { requestId, error: message });
    return jsonResponse({ error: "Webhook processing failed" }, 500, requestId);
  }
}
