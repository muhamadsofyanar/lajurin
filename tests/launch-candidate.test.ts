import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("launch migration menambah paket harga CRM dan paket merchant", async () => {
  const migration = await source("drizzle/0020_launch_commerce.sql");
  assert.match(migration, /CREATE TABLE "product_variants"/);
  assert.match(migration, /CREATE TABLE "merchant_customer_records"/);
  assert.match(migration, /CREATE TYPE "public"."merchant_plan"/);
  assert.match(migration, /product_variant_id/);
});

test("checkout memvalidasi paket dan mereservasi kuota secara atomik", async () => {
  const checkout = await source("src/app/actions/checkout.ts");
  assert.match(checkout, /eq\(productVariants\.productId, product\.product\.id\)/);
  assert.match(checkout, /gt\(productVariants\.stock, 0\)/);
  assert.match(checkout, /Kuota\+paket\+baru\+saja\+habis/);
  assert.match(checkout, /productVariantName/);
});

test("CRM memastikan hubungan pembelian sebelum menyimpan catatan", async () => {
  const customer = await source("src/app/actions/customer.ts");
  assert.match(customer, /eq\(orders\.customerId, customerId\)/);
  assert.match(customer, /eq\(products\.merchantId, merchant\.id\)/);
  assert.match(customer, /eq\(orders\.status, "PAID"\)/);
});

test("bukti pembayaran privat dan hanya tersedia untuk pesanan lunas", async () => {
  const invoice = await source("src/app/member/orders/[id]/invoice/page.tsx");
  assert.match(invoice, /eq\(orders\.status, "PAID"\)/);
  assert.match(invoice, /row\.order\.customerId === user\.id/);
  assert.match(invoice, /merchantAccess\?\.ownerId === row\.product\.merchantId/);
});

test("dokumen peluncuran publik tersedia", async () => {
  for (const path of ["src/app/terms/page.tsx", "src/app/privacy/page.tsx", "src/app/refund-policy/page.tsx", "src/app/help/page.tsx"]) {
    assert.ok((await source(path)).length > 200);
  }
});

test("status workspace selalu mengikuti status merchant", async () => {
  const migration = await source("drizzle/0021_workspace_status_alignment.sql");
  const admin = await source("src/app/actions/admin.ts");
  assert.match(migration, /profile"."status" = 'ACTIVE'/);
  assert.match(migration, /workspace"."status" = 'DRAFT'/);
  assert.match(admin, /update workspaces set status/);
  assert.match(admin, /legacy_merchant_workspace_links/);
});
