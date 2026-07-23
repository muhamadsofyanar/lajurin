"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, productReviews, products } from "@/lib/schema";

export async function submitProductReviewAction(orderId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({
    rating: z.coerce.number().int().min(1).max(5),
    title: z.string().trim().max(100).optional(),
    content: z.string().trim().min(10).max(1200),
  }).safeParse(Object.fromEntries(formData));
  const [order] = await db.select({ id: orders.id, productId: orders.productId, productSlug: products.slug }).from(orders)
    .innerJoin(products, eq(products.id, orders.productId)).where(and(
    eq(orders.id, orderId), eq(orders.customerId, user.id), eq(orders.status, "PAID"),
  )).limit(1);
  if (!parsed.success || !order) redirect(`/member/orders/${orderId}/review?error=Ulasan+belum+valid`);
  await db.insert(productReviews).values({
    productId: order.productId, orderId, customerId: user.id, ...parsed.data,
  }).onConflictDoUpdate({
    target: productReviews.orderId,
    set: { ...parsed.data, status: "PUBLISHED", updatedAt: new Date() },
  });
  revalidatePath(`/p/${order.productSlug}`);
  revalidatePath("/marketplace");
  redirect("/member/orders?success=Ulasan+berhasil+diterbitkan");
}

export async function replyProductReviewAction(reviewId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({ reply: z.string().trim().min(3).max(800) }).safeParse(Object.fromEntries(formData));
  const [owned] = await db.select({ id: productReviews.id, slug: products.slug }).from(productReviews)
    .innerJoin(products, eq(products.id, productReviews.productId))
    .where(and(eq(productReviews.id, reviewId), eq(products.merchantId, merchant.id))).limit(1);
  if (!parsed.success || !owned) redirect("/dashboard/reviews?error=Balasan+tidak+valid");
  await db.update(productReviews).set({ merchantReply: parsed.data.reply, repliedAt: new Date(), updatedAt: new Date() })
    .where(eq(productReviews.id, reviewId));
  revalidatePath("/dashboard/reviews");
  revalidatePath(`/p/${owned.slug}`);
}
