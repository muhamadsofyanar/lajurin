"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, products, productSubscriptions } from "@/lib/schema";

export async function activateSubscriptionAction(orderId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({ intervalMonths: z.coerce.number().int().min(1).max(12) }).safeParse(Object.fromEntries(formData));
  const [order] = await db.select({ order: orders }).from(orders).innerJoin(products, eq(products.id, orders.productId))
    .where(and(eq(orders.id, orderId), eq(orders.status, "PAID"), eq(products.merchantId, merchant.id))).limit(1);
  if (!parsed.success || !order.order.customerId) redirect("/dashboard/subscriptions?error=Pesanan+tidak+valid");
  const [existing] = await db.select({ id: productSubscriptions.id }).from(productSubscriptions).where(eq(productSubscriptions.orderId, orderId)).limit(1);
  if (existing) redirect("/dashboard/subscriptions?error=Pesanan+sudah+menjadi+langganan");
  const renewsAt = new Date();
  renewsAt.setMonth(renewsAt.getMonth() + parsed.data.intervalMonths);
  await db.insert(productSubscriptions).values({
    productId: order.order.productId, customerId: order.order.customerId, orderId,
    intervalMonths: parsed.data.intervalMonths, renewsAt,
  });
  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/member/subscriptions");
  redirect("/dashboard/subscriptions?success=Langganan+berhasil+diaktifkan");
}

export async function cancelSubscriptionAction(subscriptionId: string) {
  const merchant = await requireMerchant("manage");
  const [owned] = await db.select({ id: productSubscriptions.id }).from(productSubscriptions)
    .innerJoin(products, eq(products.id, productSubscriptions.productId))
    .where(and(eq(productSubscriptions.id, subscriptionId), eq(products.merchantId, merchant.id))).limit(1);
  if (!owned) return;
  await db.update(productSubscriptions).set({ status: "CANCELLED", endsAt: new Date(), updatedAt: new Date() })
    .where(eq(productSubscriptions.id, subscriptionId));
  revalidatePath("/dashboard/subscriptions");
  revalidatePath("/member/subscriptions");
}
