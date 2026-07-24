import { and, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, productVariants } from "@/lib/schema";

type AppTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Returns one reserved unit to a finite-stock variant after a terminal,
 * unpaid order failure. The conditional order update is the idempotency gate.
 */
export async function releaseOrderReservedStock(tx: AppTransaction, orderId: string) {
  const [released] = await tx.update(orders).set({
    stockReleasedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(orders.id, orderId),
    inArray(orders.status, ["FAILED", "EXPIRED"]),
    isNotNull(orders.productVariantId),
    isNull(orders.stockReleasedAt),
  )).returning({ productVariantId: orders.productVariantId });

  if (!released?.productVariantId) return false;

  await tx.update(productVariants).set({
    stock: sql`${productVariants.stock} + 1`,
    updatedAt: new Date(),
  }).where(and(
    eq(productVariants.id, released.productVariantId),
    isNotNull(productVariants.stock),
  ));
  return true;
}

/**
 * Reacquires a unit when a valid paid webhook arrives after an expired event
 * already released the reservation. Finite inventory must still be available.
 */
export async function reacquireReleasedOrderStock(tx: AppTransaction, orderId: string) {
  const [order] = await tx.select({
    productVariantId: orders.productVariantId,
    stockReleasedAt: orders.stockReleasedAt,
  }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order?.productVariantId || !order.stockReleasedAt) return false;

  const [variant] = await tx.select({ stock: productVariants.stock }).from(productVariants)
    .where(eq(productVariants.id, order.productVariantId)).limit(1);
  if (!variant) throw new Error("Varian stok untuk pembayaran terlambat tidak ditemukan");

  if (variant.stock !== null) {
    const [reserved] = await tx.update(productVariants).set({
      stock: sql`${productVariants.stock} - 1`,
      updatedAt: new Date(),
    }).where(and(
      eq(productVariants.id, order.productVariantId),
      gt(productVariants.stock, 0),
    )).returning({ id: productVariants.id });
    if (!reserved) throw new Error("Stok tidak tersedia untuk pembayaran terlambat");
  }

  await tx.update(orders).set({
    stockReleasedAt: null,
    updatedAt: new Date(),
  }).where(and(
    eq(orders.id, orderId),
    isNotNull(orders.stockReleasedAt),
  ));
  return true;
}
