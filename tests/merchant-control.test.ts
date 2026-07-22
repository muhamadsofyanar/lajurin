import assert from "node:assert/strict";
import test from "node:test";
import { merchantControlUpdateSchema } from "../src/lib/merchant-control";

test("data kontrol merchant dinormalisasi tanpa mengambil alih data toko", () => {
  const parsed = merchantControlUpdateSchema.parse({
    ownerName: "  Pemilik Toko  ",
    loginEmail: "OWNER@EXAMPLE.COM",
    supportEmail: "SUPPORT@EXAMPLE.COM",
    status: "ACTIVE",
    feePercent: "7.25",
  });

  assert.deepEqual(parsed, {
    ownerName: "Pemilik Toko",
    loginEmail: "owner@example.com",
    supportEmail: "support@example.com",
    status: "ACTIVE",
    platformFeeBps: 725,
  });
  assert.equal("brandName" in parsed, false);
});

test("komisi kosong mengikuti default dan input tidak valid ditolak", () => {
  const inherited = merchantControlUpdateSchema.parse({
    ownerName: "Pemilik Toko",
    loginEmail: "owner@example.com",
    supportEmail: "",
    status: "PENDING",
    feePercent: "",
  });
  assert.equal(inherited.platformFeeBps, null);
  assert.equal(inherited.supportEmail, null);

  assert.equal(merchantControlUpdateSchema.safeParse({
    ownerName: "A",
    loginEmail: "bukan-email",
    supportEmail: "",
    status: "ACTIVE",
    feePercent: "10.123",
  }).success, false);
});

