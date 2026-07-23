import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("migration universal commerce menambah produk digital dan formulir jasa", async () => {
  const migration = await source("drizzle/0019_universal_commerce.sql");
  assert.match(migration, /ADD VALUE IF NOT EXISTS 'DIGITAL'/);
  assert.match(migration, /CREATE TABLE "product_files"/);
  assert.match(migration, /CREATE TABLE "service_product_fields"/);
  assert.match(migration, /ON DELETE cascade/);
});

test("file digital privat hanya untuk merchant admin atau pembeli lunas", async () => {
  const route = await source("src/app/api/digital-product/[fileId]/route.ts");
  assert.match(route, /user\.role === "ADMIN"/);
  assert.match(route, /merchant\?\.ownerId === row\.product\.merchantId/);
  assert.match(route, /eq\(orders\.status, "PAID"\)/);
  assert.match(route, /Cache-Control": "private, no-store"/);
});

test("katalog tidak menghapus produk terbit atau produk yang memiliki pesanan", async () => {
  const catalog = await source("src/app/actions/catalog.ts");
  assert.match(catalog, /product\.status === "PUBLISHED"/);
  assert.match(catalog, /orderTotal\.value > 0/);
  assert.match(catalog, /status: "DRAFT"/);
});

test("formulir jasa membaca definisi merchant dan memvalidasi kolom wajib", async () => {
  const service = await source("src/app/actions/service.ts");
  const member = await source("src/app/member/services/[id]/page.tsx");
  assert.match(service, /serviceProductFields/);
  assert.match(service, /field\.required && !value/);
  assert.match(member, /fields\.map/);
  assert.match(member, /required=\{field\.required\}/);
});
