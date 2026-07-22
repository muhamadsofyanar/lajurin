"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeCouponCode } from "@/lib/discount";
import { coupons, productFunnels, products } from "@/lib/schema";

const optionalDate = z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.date().optional());
const optionalPositiveInteger = z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().int().positive().optional());
const optionalProductId = z.preprocess((value) => value === "" || value === null ? undefined : value, z.string().uuid().optional());

async function ownedProduct(productId: string, merchantId: string) {
  const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.merchantId, merchantId))).limit(1);
  return product;
}

export async function createCouponAction(productId: string, formData: FormData) {
  const merchant = await requireMerchant();
  const product = await ownedProduct(productId, merchant.id);
  if (!product) redirect("/dashboard");
  const parsed = z.object({
    code: z.string().trim().min(3).max(24).transform(normalizeCouponCode).refine((value) => /^[A-Z0-9_-]+$/.test(value)),
    discountType: z.enum(["PERCENT", "FIXED"]),
    discountValue: z.coerce.number().int().positive(),
    maxRedemptions: optionalPositiveInteger,
    startsAt: optionalDate,
    expiresAt: optionalDate,
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || (parsed.data.discountType === "PERCENT" && parsed.data.discountValue > 90) || (parsed.data.discountType === "FIXED" && parsed.data.discountValue >= product.price) || (parsed.data.startsAt && parsed.data.expiresAt && parsed.data.startsAt >= parsed.data.expiresAt)) {
    redirect(`/dashboard/products/${productId}/funnel?error=Data+kupon+belum+valid`);
  }
  const inserted = await db.insert(coupons).values({ productId, ...parsed.data }).onConflictDoNothing({ target: [coupons.productId, coupons.code] }).returning({ id: coupons.id });
  if (!inserted.length) redirect(`/dashboard/products/${productId}/funnel?error=Kode+kupon+sudah+digunakan`);
  revalidatePath(`/dashboard/products/${productId}/funnel`);
  redirect(`/dashboard/products/${productId}/funnel?success=Kupon+berhasil+dibuat`);
}

export async function toggleCouponAction(productId: string, couponId: string) {
  const merchant = await requireMerchant();
  const [coupon] = await db.select({ id: coupons.id, isActive: coupons.isActive }).from(coupons)
    .innerJoin(products, eq(coupons.productId, products.id))
    .where(and(eq(coupons.id, couponId), eq(coupons.productId, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!coupon) redirect("/dashboard");
  await db.update(coupons).set({ isActive: !coupon.isActive, updatedAt: new Date() }).where(eq(coupons.id, coupon.id));
  revalidatePath(`/dashboard/products/${productId}/funnel`);
}

export async function deleteCouponAction(productId: string, couponId: string) {
  const merchant = await requireMerchant();
  const [coupon] = await db.select({ id: coupons.id, redemptionCount: coupons.redemptionCount }).from(coupons)
    .innerJoin(products, eq(coupons.productId, products.id))
    .where(and(eq(coupons.id, couponId), eq(coupons.productId, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!coupon) redirect("/dashboard");
  if (coupon.redemptionCount > 0) redirect(`/dashboard/products/${productId}/funnel?error=Kupon+yang+sudah+digunakan+tidak+bisa+dihapus;+nonaktifkan+saja`);
  await db.delete(coupons).where(eq(coupons.id, coupon.id));
  revalidatePath(`/dashboard/products/${productId}/funnel`);
}

export async function updateFunnelAction(productId: string, formData: FormData) {
  const merchant = await requireMerchant();
  if (!await ownedProduct(productId, merchant.id)) redirect("/dashboard");
  const parsed = z.object({
    orderBumpProductId: optionalProductId,
    upsellProductId: optionalProductId,
    downsellProductId: optionalProductId,
    bumpHeadline: z.string().trim().max(120).optional(),
    bumpDescription: z.string().trim().max(500).optional(),
    isActive: z.preprocess((value) => value === "on", z.boolean()),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/dashboard/products/${productId}/funnel?error=Pengaturan+funnel+belum+valid`);
  const offerIds = [parsed.data.orderBumpProductId, parsed.data.upsellProductId, parsed.data.downsellProductId].filter((id): id is string => Boolean(id));
  if (offerIds.includes(productId)) redirect(`/dashboard/products/${productId}/funnel?error=Produk+utama+tidak+bisa+menjadi+penawaran+sendiri`);
  if (offerIds.length) {
    const validOffers = await db.select({ id: products.id }).from(products).where(and(eq(products.merchantId, merchant.id), ne(products.id, productId), inArray(products.id, offerIds)));
    if (new Set(validOffers.map((item) => item.id)).size !== new Set(offerIds).size) redirect(`/dashboard/products/${productId}/funnel?error=Produk+penawaran+tidak+valid`);
  }
  await db.insert(productFunnels).values({
    productId,
    orderBumpProductId: parsed.data.orderBumpProductId ?? null,
    upsellProductId: parsed.data.upsellProductId ?? null,
    downsellProductId: parsed.data.downsellProductId ?? null,
    bumpHeadline: parsed.data.bumpHeadline || null,
    bumpDescription: parsed.data.bumpDescription || null,
    isActive: parsed.data.isActive,
  }).onConflictDoUpdate({ target: productFunnels.productId, set: {
    orderBumpProductId: parsed.data.orderBumpProductId ?? null,
    upsellProductId: parsed.data.upsellProductId ?? null,
    downsellProductId: parsed.data.downsellProductId ?? null,
    bumpHeadline: parsed.data.bumpHeadline || null,
    bumpDescription: parsed.data.bumpDescription || null,
    isActive: parsed.data.isActive,
    updatedAt: new Date(),
  }});
  revalidatePath(`/dashboard/products/${productId}/funnel`);
  redirect(`/dashboard/products/${productId}/funnel?success=Funnel+berhasil+disimpan`);
}
