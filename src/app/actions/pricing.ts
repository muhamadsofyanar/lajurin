"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { productVariants, products } from "@/lib/schema";

async function ownedProduct(productId: string, merchantId: string) {
  const [product] = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.id, productId), eq(products.merchantId, merchantId))).limit(1);
  return product;
}

export async function createProductVariantAction(productId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    price: z.coerce.number().int().min(10000).max(100000000),
    stock: z.union([z.literal(""), z.coerce.number().int().min(0).max(1000000)]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || !(await ownedProduct(productId, merchant.id))) redirect(`/dashboard/products/${productId}/pricing?error=Paket+harga+tidak+valid`);
  const rows = await db.select({ position: productVariants.position }).from(productVariants)
    .where(eq(productVariants.productId, productId)).orderBy(asc(productVariants.position));
  await db.insert(productVariants).values({
    productId, name: parsed.data.name, price: parsed.data.price,
    stock: parsed.data.stock === "" ? null : parsed.data.stock,
    position: (rows.at(-1)?.position ?? 0) + 1,
  });
  revalidatePath(`/dashboard/products/${productId}/pricing`);
}

export async function updateProductVariantAction(productId: string, variantId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    price: z.coerce.number().int().min(10000).max(100000000),
    stock: z.union([z.literal(""), z.coerce.number().int().min(0).max(1000000)]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || !(await ownedProduct(productId, merchant.id))) redirect(`/dashboard/products/${productId}/pricing?error=Paket+harga+tidak+valid`);
  await db.update(productVariants).set({
    name: parsed.data.name, price: parsed.data.price,
    stock: parsed.data.stock === "" ? null : parsed.data.stock,
    isActive: formData.get("isActive") === "on", updatedAt: new Date(),
  }).where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)));
  revalidatePath(`/dashboard/products/${productId}/pricing`);
}

export async function deleteProductVariantAction(productId: string, variantId: string) {
  const merchant = await requireMerchant("manage");
  if (!(await ownedProduct(productId, merchant.id))) redirect("/dashboard/products");
  await db.delete(productVariants).where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)));
  revalidatePath(`/dashboard/products/${productId}/pricing`);
}
