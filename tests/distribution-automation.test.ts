import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("migration v3 menambah affiliate booking subscription dan reminder", () => {
  const migration = read("drizzle/0022_distribution_automation.sql");
  for (const value of ["affiliate_programs", "affiliate_partners", "affiliate_commissions", "booking_slots", "booking_appointments", "product_subscriptions", "CHECKOUT_REMINDER"]) {
    assert.match(migration, new RegExp(value));
  }
});

test("kode affiliate dipertahankan sampai order dan komisi dibuat saat lunas", () => {
  assert.match(read("src/app/p/[slug]/page.tsx"), /query\.set\("ref"/);
  assert.match(read("src/app/actions/checkout.ts"), /affiliatePartnerId: affiliate\?\.id/);
  assert.match(read("src/lib/funnel.ts"), /affiliateCommissions/);
  assert.match(read("src/lib/funnel.ts"), /commissionBps/);
});

test("booking hanya untuk order jasa lunas dan kapasitas direservasi atomik", () => {
  const action = read("src/app/actions/booking.ts");
  assert.match(action, /eq\(orders\.status, "PAID"\)/);
  assert.match(action, /bookedCount: sql/);
  assert.ok(action.includes("bookingSlots.bookedCount") && action.includes("bookingSlots.capacity"));
});

test("pengingat checkout mewajibkan consent dan secret internal", () => {
  const route = read("src/app/api/jobs/checkout-reminders/route.ts");
  assert.match(route, /INTERNAL_JOB_SECRET/);
  assert.match(route, /marketingConsent/);
  assert.match(route, /CHECKOUT_REMINDER/);
});

test("PWA tidak melakukan cache paksa untuk respons autentikasi", () => {
  const sw = read("public/sw.js");
  assert.match(sw, /fetch\(event\.request\)/);
  assert.doesNotMatch(sw, /cache\.put\(event\.request/);
  assert.match(read("src/app/layout.tsx"), /manifest\.webmanifest/);
});
