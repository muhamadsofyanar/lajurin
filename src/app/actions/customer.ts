"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { merchantCustomerRecords, orders, products } from "@/lib/schema";

export async function updateCustomerRecordAction(customerId: string, formData: FormData) {
  const merchant = await requireMerchant("read");
  const parsed = z.object({
    tags: z.string().trim().max(300),
    note: z.string().trim().max(3000),
  }).safeParse(Object.fromEntries(formData));
  const [relationship] = await db.select({ id: orders.id }).from(orders).innerJoin(products, eq(orders.productId, products.id))
    .where(and(eq(orders.customerId, customerId), eq(products.merchantId, merchant.id), eq(orders.status, "PAID"))).limit(1);
  if (!relationship || !parsed.success) redirect("/dashboard/customers?error=Data+pelanggan+tidak+valid");
  const tags = [...new Set(parsed.data.tags.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 20);
  await db.insert(merchantCustomerRecords).values({
    merchantId: merchant.id, customerId, tags, note: parsed.data.note || null,
  }).onConflictDoUpdate({
    target: [merchantCustomerRecords.merchantId, merchantCustomerRecords.customerId],
    set: { tags, note: parsed.data.note || null, updatedAt: new Date() },
  });
  revalidatePath("/dashboard/customers");
}
