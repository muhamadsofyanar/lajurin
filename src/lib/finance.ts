import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { merchantLedgerEntries, merchantProfiles, orders, platformReceivableEntries, platformSettings, products } from "@/lib/schema";

export type AppTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const DEFAULT_PLATFORM_FEE_BPS = 0;
export const DEFAULT_MINIMUM_PAYOUT = 100000;

export function calculateOrderAccounting(amount: number, feeBps: number) {
  const safeBps = Math.min(10000, Math.max(0, feeBps));
  const platformFeeAmount = Math.floor((amount * safeBps) / 10000);
  return {
    platformFeeBps: safeBps,
    platformFeeAmount,
    merchantNetAmount: amount - platformFeeAmount,
  };
}

export async function recordPaidOrderAccounting(tx: AppTransaction, orderId: string) {
  const [row] = await tx.select({
    amount: orders.amount,
    externalId: orders.externalId,
    savedFeeBps: orders.platformFeeBps,
    savedFeeAmount: orders.platformFeeAmount,
    savedNetAmount: orders.merchantNetAmount,
    settlementMode: orders.settlementMode,
    merchantId: products.merchantId,
    merchantFeeBps: merchantProfiles.platformFeeBps,
  }).from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .leftJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!row) throw new Error("Order accounting source not found");

  const [settings] = await tx.select({ defaultFeeBps: platformSettings.defaultPlatformFeeBps })
    .from(platformSettings).where(eq(platformSettings.id, 1)).limit(1);
  const accounting = row.savedNetAmount !== null && row.savedFeeAmount !== null && row.savedFeeBps !== null
    ? {
        platformFeeBps: row.savedFeeBps,
        platformFeeAmount: row.savedFeeAmount,
        merchantNetAmount: row.savedNetAmount,
      }
    : calculateOrderAccounting(row.amount, row.merchantFeeBps ?? settings?.defaultFeeBps ?? DEFAULT_PLATFORM_FEE_BPS);

  await tx.update(orders).set({ ...accounting, updatedAt: new Date() }).where(eq(orders.id, orderId));
  if (row.settlementMode === "MERCHANT_DIRECT") {
    if (accounting.platformFeeAmount > 0) {
      await tx.insert(platformReceivableEntries).values({
        merchantId: row.merchantId,
        orderId,
        type: "MANUAL_SALE_FEE",
        amount: accounting.platformFeeAmount,
        description: `Komisi transfer langsung ${row.externalId}`,
      }).onConflictDoNothing({
        target: [platformReceivableEntries.orderId, platformReceivableEntries.type],
      });
    }
  } else if (accounting.merchantNetAmount > 0) {
    await tx.insert(merchantLedgerEntries).values({
      merchantId: row.merchantId,
      orderId,
      type: "SALE",
      amount: accounting.merchantNetAmount,
      description: `Saldo bersih penjualan ${row.externalId}`,
    }).onConflictDoNothing({
      target: [merchantLedgerEntries.orderId, merchantLedgerEntries.type],
    });
  }
  return { ...accounting, merchantId: row.merchantId };
}

export async function getMerchantBalance(merchantId: string) {
  const [row] = await db.select({
    balance: sql<number>`coalesce(sum(${merchantLedgerEntries.amount}), 0)::integer`,
  }).from(merchantLedgerEntries).where(eq(merchantLedgerEntries.merchantId, merchantId));
  return Number(row?.balance ?? 0);
}

export function formatFeePercent(feeBps: number) {
  const value = feeBps / 100;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}
