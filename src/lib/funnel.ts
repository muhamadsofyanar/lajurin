import { and, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { normalizeCouponCode } from "@/lib/discount";
import type { AppTransaction } from "@/lib/finance";
import { analyticsEvents, couponRedemptions, coupons, courses, enrollments, orders } from "@/lib/schema";

export async function findValidCoupon(productId: string, rawCode: string | null | undefined) {
  const code = normalizeCouponCode(rawCode ?? "");
  if (!code) return null;
  const now = new Date();
  const [coupon] = await db.select().from(coupons).where(and(
    eq(coupons.productId, productId),
    eq(coupons.code, code),
    eq(coupons.isActive, true),
    or(isNull(coupons.startsAt), lte(coupons.startsAt, now)),
    or(isNull(coupons.expiresAt), gt(coupons.expiresAt, now)),
  )).limit(1);
  if (!coupon) return null;
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) return null;
  return coupon;
}

export async function fulfillPaidOrder(tx: AppTransaction, orderId: string) {
  const [order] = await tx.select({
    customerId: orders.customerId,
    productId: orders.productId,
    bumpProductId: orders.orderBumpProductId,
    couponId: orders.couponId,
    discountAmount: orders.discountAmount,
    utmSource: orders.utmSource,
    utmMedium: orders.utmMedium,
    utmCampaign: orders.utmCampaign,
  }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order?.customerId) throw new Error("Order customer not found");

  const productIds = [order.productId, order.bumpProductId].filter((id): id is string => Boolean(id));
  const courseRows = await tx.select({ id: courses.id, productId: courses.productId }).from(courses).where(inArray(courses.productId, productIds));
  for (const course of courseRows) {
    await tx.insert(enrollments).values({ userId: order.customerId, courseId: course.id, orderId })
      .onConflictDoUpdate({ target: [enrollments.userId, enrollments.courseId], set: { orderId } });
  }

  if (order.couponId && order.discountAmount > 0) {
    const inserted = await tx.insert(couponRedemptions).values({
      couponId: order.couponId,
      orderId,
      customerId: order.customerId,
      discountAmount: order.discountAmount,
    }).onConflictDoNothing({ target: couponRedemptions.orderId }).returning({ id: couponRedemptions.id });
    if (inserted.length) {
      await tx.update(coupons).set({ redemptionCount: sql`${coupons.redemptionCount} + 1`, updatedAt: new Date() }).where(eq(coupons.id, order.couponId));
    }
  }

  await tx.insert(analyticsEvents).values({
    productId: order.productId,
    orderId,
    event: "PURCHASE",
    utmSource: order.utmSource,
    utmMedium: order.utmMedium,
    utmCampaign: order.utmCampaign,
  }).onConflictDoNothing({ target: [analyticsEvents.orderId, analyticsEvents.event] });
}
