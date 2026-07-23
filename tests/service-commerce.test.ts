import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { serviceStatusLabel } from "../src/lib/services";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("alur layanan memiliki delapan status operasional", () => {
  assert.deepEqual(Object.keys(serviceStatusLabel), [
    "WAITING_PAYMENT", "WAITING_DOCUMENTS", "DOCUMENT_REVIEW", "REVISION_REQUIRED",
    "IN_PROGRESS", "WAITING_AGENCY", "COMPLETED", "CANCELLED",
  ]);
});

test("dokumen layanan selalu privat dan dibatasi berdasarkan pihak", async () => {
  const route = await source("src/app/api/service-document/[documentId]/route.ts");
  assert.match(route, /getCurrentUser/);
  assert.match(route, /merchantAccess\?\.ownerId === row\.serviceCase\.merchantId/);
  assert.match(route, /row\.serviceCase\.customerId === user\.id/);
  assert.match(route, /Cache-Control": "private, no-store"/);
});

test("produk jasa membuat kasus saat checkout dan pembayaran membuka dokumen", async () => {
  const checkout = await source("src/app/actions/checkout.ts");
  const payment = await source("src/app/actions/payment.ts");
  assert.match(checkout, /product\.product\.type === "SERVICE"/);
  assert.match(checkout, /insert\(serviceCases\)/);
  assert.match(payment, /status: "WAITING_DOCUMENTS"/);
});

test("penugasan staf harus berasal dari workspace aktif", async () => {
  const service = await source("src/app/actions/service.ts");
  assert.match(service, /eq\(workspaceMemberships\.workspaceId, merchant\.workspaceId\)/);
  assert.match(service, /eq\(workspaceMemberships\.status, "ACTIVE"\)/);
});
