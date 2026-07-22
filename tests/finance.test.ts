import assert from "node:assert/strict";
import test from "node:test";
import { calculateDiscount, normalizeCouponCode } from "../src/lib/discount";
import { calculateOrderAccounting } from "../src/lib/finance";

test("komisi disimpan dalam basis point dan dibulatkan ke bawah", () => {
  assert.deepEqual(calculateOrderAccounting(149_000, 1_000), {
    platformFeeBps: 1_000,
    platformFeeAmount: 14_900,
    merchantNetAmount: 134_100,
  });
  assert.equal(calculateOrderAccounting(100_000, -5).platformFeeAmount, 0);
  assert.equal(calculateOrderAccounting(100_000, 20_000).merchantNetAmount, 0);
});

test("diskon tidak dapat membuat harga produk utama di bawah Rp1.000", () => {
  assert.equal(calculateDiscount(100_000, "PERCENT", 25), 25_000);
  assert.equal(calculateDiscount(10_000, "FIXED", 50_000), 9_000);
  assert.equal(normalizeCouponCode(" hemat  20 "), "HEMAT20");
});
