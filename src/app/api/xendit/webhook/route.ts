import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { courses, enrollments, orders, products } from "@/lib/schema";

type PaymentSessionWebhook = {
  event: "payment_session.completed" | "payment_session.expired";
  created: string;
  data: {
    payment_session_id: string;
    reference_id: string;
    session_type: "PAY";
    amount: number;
    currency: "IDR";
    status: "COMPLETED" | "EXPIRED";
    payment_id?: string;
  };
};

function tokenMatches(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function POST(request: Request) {
  if (
    !tokenMatches(
      request.headers.get("x-callback-token"),
      process.env.XENDIT_WEBHOOK_TOKEN,
    )
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PaymentSessionWebhook;
  try {
    payload = (await request.json()) as PaymentSessionWebhook;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const [order] = await db.select({ order: orders, courseId: courses.id }).from(orders).innerJoin(products, eq(orders.productId, products.id)).leftJoin(courses, eq(courses.productId, products.id)).where(eq(orders.externalId, payload.data.reference_id)).limit(1);
  if (!order || order.order.xenditSessionId !== payload.data.payment_session_id) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  if (payload.event === "payment_session.completed") {
    if (payload.data.status !== "COMPLETED" || payload.data.currency !== "IDR" || payload.data.amount !== order.order.amount || !order.order.customerId) {
      return Response.json({ error: "Payment amount mismatch" }, { status: 422 });
    }
    if (!order.courseId) {
      return Response.json({ error: "Course not found" }, { status: 422 });
    }

    await db.transaction(async (tx) => {
      await tx.update(orders).set({
          status: "PAID",
          paidAt: new Date(payload.created),
          xenditPaymentId: payload.data.payment_id,
          webhookPayload: payload,
          updatedAt: new Date(),
      }).where(eq(orders.id, order.order.id));
      await tx.insert(enrollments).values({ userId: order.order.customerId!, courseId: order.courseId!, orderId: order.order.id }).onConflictDoUpdate({ target: [enrollments.userId, enrollments.courseId], set: { orderId: order.order.id } });
    });
  } else if (payload.event === "payment_session.expired") {
    await db.update(orders).set({ status: "EXPIRED", webhookPayload: payload, updatedAt: new Date() }).where(eq(orders.id, order.order.id));
  }

  return Response.json({ received: true });
}
