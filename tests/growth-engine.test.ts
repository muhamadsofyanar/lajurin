import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("homepage menjual hasil bisnis dan mencakup tiga tipe commerce", async () => {
  const home = await source("src/app/page.tsx");
  assert.match(home, /Ubah keahlian Anda menjadi bisnis/);
  assert.match(home, /Kursus online/);
  assert.match(home, /Produk digital/);
  assert.match(home, /Jasa profesional/);
  assert.match(home, /Tanpa sistem terpadu/);
  assert.match(home, /Dengan Rizqhub/);
});

test("katalog memberi akses langsung ke landing page dan filter universal", async () => {
  const catalog = await source("src/app/dashboard/products/page.tsx");
  assert.match(catalog, /Landing Page/);
  assert.match(catalog, /ilike\(products\.name/);
  assert.match(catalog, /eq\(products\.type, type\)/);
  assert.match(catalog, /eq\(products\.status, status\)/);
});

test("CRM mengambil semua pembeli lunas bukan hanya enrollment kursus", async () => {
  const crm = await source("src/app/dashboard/customers/page.tsx");
  assert.match(crm, /\.from\(orders\)/);
  assert.match(crm, /eq\(orders\.status, "PAID"\)/);
  assert.match(crm, /row\.product\.type === "COURSE"/);
});

test("checkout menjelaskan delivery sesuai tipe produk", async () => {
  const checkout = await source("src/app/checkout/[slug]/page.tsx");
  assert.match(checkout, /Akses kelas terbuka/);
  assert.match(checkout, /File privat tersedia/);
  assert.match(checkout, /Portal layanan terbuka/);
});

test("halaman tim memakai workspace aktif yang sama dengan sesi merchant", async () => {
  const resolver = await source("src/lib/merchant-workspace.ts");
  assert.match(resolver, /merchant\.workspaceId \? eq\(workspaces\.id, merchant\.workspaceId\)/);
  assert.match(resolver, /eq\(workspaceMemberships\.status, "ACTIVE"\)/);
});
