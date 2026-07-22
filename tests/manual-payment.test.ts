import assert from "node:assert/strict";
import test from "node:test";
import { accountingDestination, canReviewManualPayment, requiresAdminOverrideReason } from "../src/lib/manual-payment";

test("merchant hanya dapat meninjau transfer langsung miliknya", () => {
  assert.equal(canReviewManualPayment({ reviewerRole: "MERCHANT", reviewerId: "m-1", merchantId: "m-1", settlementMode: "MERCHANT_DIRECT" }), true);
  assert.equal(canReviewManualPayment({ reviewerRole: "MERCHANT", reviewerId: "m-2", merchantId: "m-1", settlementMode: "MERCHANT_DIRECT" }), false);
  assert.equal(canReviewManualPayment({ reviewerRole: "MERCHANT", reviewerId: "m-1", merchantId: "m-1", settlementMode: "PLATFORM" }), false);
});

test("admin boleh meninjau semua transfer tetapi direct membutuhkan alasan override", () => {
  assert.equal(canReviewManualPayment({ reviewerRole: "ADMIN", reviewerId: "a-1", merchantId: "m-1", settlementMode: "PLATFORM" }), true);
  assert.equal(canReviewManualPayment({ reviewerRole: "ADMIN", reviewerId: "a-1", merchantId: "m-1", settlementMode: "MERCHANT_DIRECT" }), true);
  assert.equal(requiresAdminOverrideReason("ADMIN", "MERCHANT_DIRECT"), true);
  assert.equal(requiresAdminOverrideReason("ADMIN", "PLATFORM"), false);
});

test("transfer direct menjadi piutang komisi dan bukan saldo payout", () => {
  assert.equal(accountingDestination("MERCHANT_DIRECT"), "PLATFORM_RECEIVABLE");
  assert.equal(accountingDestination("PLATFORM"), "MERCHANT_PAYOUT_BALANCE");
});
