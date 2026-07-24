import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { reserveAffiliatePayout, settleAffiliatePayout } from "../src/lib/affiliate-payout";
import { db, pool } from "../src/lib/db";
import { reacquireReleasedOrderStock, releaseOrderReservedStock } from "../src/lib/inventory";
import {
  affiliateCommissions,
  affiliatePartners,
  affiliatePayoutRequests,
  affiliatePrograms,
  orders,
  products,
  productVariants,
  users,
} from "../src/lib/schema";

const enabled = process.env.RUN_DATABASE_TESTS === "true";
const rollback = Symbol("ROLLBACK_TEST_TRANSACTION");

test("database menjaga reservasi payout affiliate dan pelepasan stok secara idempoten", {
  skip: !enabled,
}, async () => {
  try {
    await db.transaction(async (tx) => {
      const suffix = randomUUID();
      const [merchant, affiliate, admin] = await tx.insert(users).values([
        { name: "Merchant Test", email: `merchant-${suffix}@example.test`, passwordHash: "test", role: "MERCHANT" },
        { name: "Affiliate Test", email: `affiliate-${suffix}@example.test`, passwordHash: "test", role: "MEMBER" },
        { name: "Admin Test", email: `admin-${suffix}@example.test`, passwordHash: "test", role: "ADMIN" },
      ]).returning();
      const [product] = await tx.insert(products).values({
        merchantId: merchant.id,
        name: "Produk Integritas",
        slug: `produk-integritas-${suffix}`,
        headline: "Produk untuk pengujian integritas transaksi",
        description: "Fixture pengujian database yang selalu dibatalkan setelah test.",
        price: 100_000,
        type: "DIGITAL",
        status: "PUBLISHED",
      }).returning();
      const [variant] = await tx.insert(productVariants).values({
        productId: product.id,
        name: "Terbatas",
        price: 100_000,
        stock: 1,
        position: 1,
      }).returning();

      const [failedOrder] = await tx.insert(orders).values({
        externalId: `STOCK-${suffix}`,
        productId: product.id,
        productVariantId: variant.id,
        productVariantName: variant.name,
        customerId: affiliate.id,
        customerName: affiliate.name,
        customerEmail: affiliate.email,
        amount: 100_000,
        status: "FAILED",
        paymentMethod: "XENDIT",
      }).returning();
      assert.equal(await releaseOrderReservedStock(tx, failedOrder.id), true);
      assert.equal(await releaseOrderReservedStock(tx, failedOrder.id), false);
      const [stockAfterRelease] = await tx.select({ stock: productVariants.stock }).from(productVariants)
        .where(eq(productVariants.id, variant.id));
      assert.equal(stockAfterRelease.stock, 2);
      assert.equal(await reacquireReleasedOrderStock(tx, failedOrder.id), true);
      assert.equal(await reacquireReleasedOrderStock(tx, failedOrder.id), false);
      const [stockAfterReacquire] = await tx.select({ stock: productVariants.stock }).from(productVariants)
        .where(eq(productVariants.id, variant.id));
      assert.equal(stockAfterReacquire.stock, 1);

      const [program] = await tx.insert(affiliatePrograms).values({
        productId: product.id,
        commissionBps: 1000,
      }).returning();
      const [partner] = await tx.insert(affiliatePartners).values({
        programId: program.id,
        userId: affiliate.id,
        code: `RQ-${suffix}`,
      }).returning();
      const paidOrders = await tx.insert(orders).values([
        {
          externalId: `AFF-1-${suffix}`,
          productId: product.id,
          customerId: affiliate.id,
          customerName: affiliate.name,
          customerEmail: affiliate.email,
          amount: 300_000,
          status: "PAID",
        },
        {
          externalId: `AFF-2-${suffix}`,
          productId: product.id,
          customerId: affiliate.id,
          customerName: affiliate.name,
          customerEmail: affiliate.email,
          amount: 250_000,
          status: "PAID",
        },
      ]).returning();
      await tx.insert(affiliateCommissions).values([
        { partnerId: partner.id, orderId: paidOrders[0].id, amount: 30_000 },
        { partnerId: partner.id, orderId: paidOrders[1].id, amount: 25_000 },
      ]);

      const account = { bankName: "BANK TEST", accountNumber: "1234567890", accountHolder: "Affiliate Test" };
      const firstRequest = await reserveAffiliatePayout(tx, affiliate.id, account);
      assert.equal(firstRequest.amount, 55_000);
      const reserved = await tx.select().from(affiliateCommissions)
        .where(eq(affiliateCommissions.payoutRequestId, firstRequest.id));
      assert.equal(reserved.length, 2);
      assert.ok(reserved.every((commission) => commission.status === "RESERVED"));

      await settleAffiliatePayout(tx, firstRequest.id, "REJECTED", {
        adminId: admin.id,
        note: "Rekening perlu diperbaiki",
      });
      const released = await tx.select().from(affiliateCommissions)
        .where(eq(affiliateCommissions.partnerId, partner.id));
      assert.ok(released.every((commission) => commission.status === "PENDING" && commission.payoutRequestId === null));

      const secondRequest = await reserveAffiliatePayout(tx, affiliate.id, account);
      await settleAffiliatePayout(tx, secondRequest.id, "PAID", {
        adminId: admin.id,
        note: "Transfer berhasil diverifikasi",
      });
      const settled = await tx.select().from(affiliateCommissions)
        .where(and(
          eq(affiliateCommissions.partnerId, partner.id),
          eq(affiliateCommissions.payoutRequestId, secondRequest.id),
        ));
      assert.equal(settled.length, 2);
      assert.ok(settled.every((commission) => commission.status === "PAID" && commission.paidAt));
      const [paidRequest] = await tx.select().from(affiliatePayoutRequests)
        .where(eq(affiliatePayoutRequests.id, secondRequest.id));
      assert.equal(paidRequest.status, "PAID");

      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await pool.end();
  }
});
