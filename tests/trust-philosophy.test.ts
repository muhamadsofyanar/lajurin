import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("filosofi RizqHub hadir ringkas di homepage dan lengkap pada halaman khusus", () => {
  const home = read("src/app/page.tsx");
  const philosophy = read("src/app/filosofi/page.tsx");
  assert.match(home, /Bukan sekadar bisnis/);
  assert.match(home, /\/filosofi/);
  assert.match(philosophy, /Allah adalah Ar-Razzāq/);
  assert.match(philosophy, /Abdul Rozaq/);
  assert.match(philosophy, /menjadi wasilah, bukan tujuan/i);
});

test("ulasan hanya dapat dibuat dari order lunas milik pembeli", () => {
  const action = read("src/app/actions/review.ts");
  assert.match(action, /eq\(orders\.customerId, user\.id\)/);
  assert.match(action, /eq\(orders\.status, "PAID"\)/);
  assert.match(read("drizzle/0023_trust_growth.sql"), /product_reviews_rating_check/);
});

test("marketplace mendukung merchant terverifikasi unggulan rating dan pengurutan", () => {
  const marketplace = read("src/app/marketplace/page.tsx");
  for (const marker of ["isVerified", "isFeatured", "productReviews", "price_low", "rating"]) assert.match(marketplace, new RegExp(marker));
});

test("admin dapat mengendalikan verifikasi merchant unggulan dan moderasi ulasan", () => {
  const admin = read("src/app/actions/admin.ts");
  assert.match(admin, /toggleMerchantVerificationAction/);
  assert.match(admin, /toggleProductFeaturedAction/);
  assert.match(admin, /moderateProductReviewAction/);
});

test("landing page menampilkan bukti transaksi dan CTA mobile", () => {
  const product = read("src/app/p/[slug]/page.tsx");
  assert.match(product, /Pembelian terverifikasi/);
  assert.match(product, /mobile-sticky-cta/);
});
