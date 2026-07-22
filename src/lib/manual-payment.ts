export type ManualPaymentReviewerRole = "ADMIN" | "MERCHANT";
export type ManualPaymentSettlementMode = "PLATFORM" | "MERCHANT_DIRECT";

export function canReviewManualPayment(input: {
  reviewerRole: ManualPaymentReviewerRole;
  reviewerId: string;
  merchantId: string;
  settlementMode: ManualPaymentSettlementMode;
}) {
  if (input.reviewerRole === "ADMIN") return true;
  return input.settlementMode === "MERCHANT_DIRECT" && input.reviewerId === input.merchantId;
}

export function requiresAdminOverrideReason(
  reviewerRole: ManualPaymentReviewerRole,
  settlementMode: ManualPaymentSettlementMode,
) {
  return reviewerRole === "ADMIN" && settlementMode === "MERCHANT_DIRECT";
}

export function accountingDestination(settlementMode: ManualPaymentSettlementMode) {
  return settlementMode === "MERCHANT_DIRECT" ? "PLATFORM_RECEIVABLE" : "MERCHANT_PAYOUT_BALANCE";
}
