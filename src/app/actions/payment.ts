"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, requireMerchant, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordPaidOrderAccounting } from "@/lib/finance";
import { featureEnabled, requireFeature } from "@/lib/feature-flags";
import { fulfillPaidOrder } from "@/lib/funnel";
import { canReviewManualPayment, requiresAdminOverrideReason } from "@/lib/manual-payment";
import { auditLogs, enrollments, inAppNotifications, merchantLedgerEntries, orders, platformReceivableEntries, products, serviceCases } from "@/lib/schema";
import { paymentProofDirectory, paymentProofPath } from "@/lib/storage";
import { currentRequestIdentity, enforceRateLimit, verifyUploadSignature } from "@/lib/security";
import { enqueueDomainEvent, merchantAutomationEvent, orderNotificationEvent } from "@/platform/events/outbox";
import { currentCorrelationContext } from "@/platform/observability/server-context";

const proofTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export async function submitManualPaymentAction(orderId: string, formData: FormData) {
  const user = await requireUser();
  const rateLimitKey = await currentRequestIdentity("payment-proof", `${user.id}:${orderId}`);
  const rateLimit = await enforceRateLimit(rateLimitKey, { limit: 5, windowMs: 30 * 60_000, blockMs: 60 * 60_000 });
  if (rateLimit.limited) redirect(`/payment/manual/${orderId}?error=Terlalu+banyak+percobaan+unggah.+Coba+lagi+nanti`);
  const parsed = z.object({
    bankName: z.string().trim().min(2).max(80),
    accountName: z.string().trim().min(2).max(100),
    note: z.string().trim().max(500).optional(),
  }).safeParse({
    bankName: formData.get("bankName"),
    accountName: formData.get("accountName"),
    note: formData.get("note") || undefined,
  });
  const proof = formData.get("proof");
  if (!parsed.success || !(proof instanceof File) || !proofTypes[proof.type] || proof.size < 1 || proof.size > 3 * 1024 * 1024) {
    redirect(`/payment/manual/${orderId}?error=Lengkapi+data+dan+unggah+bukti+JPG,+PNG,+WebP,+atau+PDF+maksimal+3MB`);
  }

  const [order] = await db.select({
    id: orders.id,
    externalId: orders.externalId,
    previousProof: orders.manualProofUrl,
    settlementMode: orders.settlementMode,
    merchantId: products.merchantId,
  }).from(orders).innerJoin(products, eq(orders.productId, products.id)).where(and(
    eq(orders.id, orderId), eq(orders.customerId, user.id), eq(orders.paymentMethod, "MANUAL_TRANSFER"), inArray(orders.status, ["PENDING", "REJECTED"]),
  )).limit(1);
  if (!order) redirect("/member/orders?error=Pesanan+tidak+ditemukan");
  const notifyMerchant = await featureEnabled("BASIC_NOTIFICATIONS", order.merchantId);

  const proofBuffer = Buffer.from(await proof.arrayBuffer());
  if (!verifyUploadSignature(proofBuffer, proof.type)) {
    redirect(`/payment/manual/${orderId}?error=Isi+file+tidak+sesuai+dengan+format+yang+dipilih`);
  }
  const fileName = `${order.id}-${randomUUID()}${proofTypes[proof.type]}`;
  await mkdir(paymentProofDirectory, { recursive: true });
  await writeFile(paymentProofPath(fileName), proofBuffer, { flag: "wx" });

  try {
    await db.transaction(async (tx) => {
      await tx.update(orders).set({
        status: "AWAITING_CONFIRMATION",
        manualProofUrl: fileName,
        manualBankName: parsed.data.bankName,
        manualAccountName: parsed.data.accountName,
        manualTransferNote: parsed.data.note || null,
        manualSubmittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
        updatedAt: new Date(),
      }).where(eq(orders.id, order.id));
      await tx.insert(auditLogs).values({
        actorId: user.id,
        action: "MANUAL_PAYMENT_PROOF_SUBMITTED",
        entityType: "ORDER",
        entityId: order.id,
        metadata: { settlementMode: order.settlementMode },
      });
      if (order.settlementMode === "MERCHANT_DIRECT" && notifyMerchant) {
        await tx.insert(inAppNotifications).values({
          userId: order.merchantId,
          actorId: user.id,
          type: "MANUAL_PAYMENT_SUBMITTED",
          title: "Bukti transfer menunggu konfirmasi",
          body: `Pesanan ${order.externalId} telah mengunggah bukti transfer.`,
          href: "/dashboard/payments",
          dedupeKey: `manual-proof:${order.id}:${fileName}`,
        });
      }
    });
  } catch (error) {
    await unlink(paymentProofPath(fileName)).catch(() => undefined);
    throw error;
  }
  if (order.previousProof && order.previousProof !== fileName) {
    try { await unlink(paymentProofPath(order.previousProof)); } catch { /* file lama tidak menghalangi bukti baru */ }
  }
  redirect(`/member/orders?success=Bukti+pembayaran+berhasil+dikirim`);
}

export async function reviewManualPaymentAction(orderId: string, decision: "approve" | "reject", formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({ reason: z.string().trim().max(500).optional() }).safeParse({
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) redirect("/admin/payments?error=Alasan+tidak+valid");
  return reviewManualPayment({ reviewerId: admin.id, reviewerRole: "ADMIN", orderId, decision, reason: parsed.data.reason ?? null });
}

class ManualPaymentReviewError extends Error {}

async function reviewManualPayment(input: {
  reviewerId: string;
  reviewerRole: "ADMIN" | "MERCHANT";
  orderId: string;
  decision: "approve" | "reject";
  reason: string | null;
}) {
  const parsedDecision = z.enum(["approve", "reject"]).parse(input.decision);
  const destination = input.reviewerRole === "ADMIN" ? "/admin/payments" : "/dashboard/payments";
  const requestContext = await currentCorrelationContext();
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`order:${input.orderId}`}))`);
      const [row] = await tx.select({ order: orders, merchantId: products.merchantId }).from(orders)
        .innerJoin(products, eq(orders.productId, products.id))
        .where(and(eq(orders.id, input.orderId), eq(orders.paymentMethod, "MANUAL_TRANSFER"))).limit(1);
      if (!row || !row.order.customerId || row.order.status !== "AWAITING_CONFIRMATION") {
        throw new ManualPaymentReviewError("Pesanan sudah diproses atau tidak siap ditinjau");
      }
      if (!canReviewManualPayment({
        reviewerRole: input.reviewerRole,
        reviewerId: input.reviewerId,
        merchantId: row.merchantId,
        settlementMode: row.order.settlementMode,
      })) throw new ManualPaymentReviewError("Anda tidak berhak meninjau pembayaran ini");
      if (requiresAdminOverrideReason(input.reviewerRole, row.order.settlementMode) && (!input.reason || input.reason.length < 10)) {
        throw new ManualPaymentReviewError("Alasan override admin minimal 10 karakter");
      }
      if (parsedDecision === "reject" && (!input.reason || input.reason.length < 5)) {
        throw new ManualPaymentReviewError("Alasan penolakan minimal 5 karakter");
      }

      const [updated] = await tx.update(orders).set({
        status: parsedDecision === "approve" ? "PAID" : "REJECTED",
        paidAt: parsedDecision === "approve" ? new Date() : null,
        reviewedAt: new Date(), reviewedBy: input.reviewerId, updatedAt: new Date(),
      }).where(and(eq(orders.id, row.order.id), eq(orders.status, "AWAITING_CONFIRMATION"))).returning({ id: orders.id });
      if (!updated) throw new ManualPaymentReviewError("Pesanan sudah diproses oleh pengguna lain");

      if (parsedDecision === "approve") {
        await tx.update(serviceCases).set({ status: "WAITING_DOCUMENTS", updatedAt: new Date() })
          .where(eq(serviceCases.orderId, row.order.id));
        await fulfillPaidOrder(tx, row.order.id);
        await recordPaidOrderAccounting(tx, row.order.id);
      }
      await tx.insert(auditLogs).values({
        actorId: input.reviewerId,
        requestId: requestContext.requestId,
        action: parsedDecision === "approve" ? "MANUAL_PAYMENT_APPROVED" : "MANUAL_PAYMENT_REJECTED",
        entityType: "ORDER",
        entityId: row.order.id,
        metadata: {
          amount: row.order.amount,
          reviewerRole: input.reviewerRole,
          settlementMode: row.order.settlementMode,
          reason: input.reason,
          adminOverride: input.reviewerRole === "ADMIN" && row.order.settlementMode === "MERCHANT_DIRECT",
        },
      });
      await enqueueDomainEvent(tx, orderNotificationEvent({
        orderId: row.order.id,
        notificationEvent: parsedDecision === "approve" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
        correlationId: requestContext.correlationId,
      }));
      if (parsedDecision === "approve") {
        await enqueueDomainEvent(tx, merchantAutomationEvent({
          sourceId: row.order.id,
          trigger: "PURCHASED",
          correlationId: requestContext.correlationId,
        }));
      }
      return undefined;
    });
  } catch (error) {
    if (error instanceof ManualPaymentReviewError) redirect(`${destination}?error=${encodeURIComponent(error.message)}`);
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/integrations");
  revalidatePath("/admin/transactions");
  revalidatePath("/admin/merchants");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/finance");
  revalidatePath("/member");
  revalidatePath("/member/orders");
  redirect(`${destination}?success=Pembayaran+manual+berhasil+${parsedDecision === "approve" ? "disetujui" : "ditolak"}`);
}

export async function reviewMerchantManualPaymentAction(orderId: string, decision: "approve" | "reject", formData: FormData) {
  const merchant = await requireMerchant("finance");
  await requireFeature("DIRECT_MANUAL_PAYMENTS", merchant.id);
  const parsed = z.object({ reason: z.string().trim().max(500).optional() }).safeParse({
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) redirect("/dashboard/payments?error=Alasan+tidak+valid");
  return reviewManualPayment({
    reviewerId: merchant.id,
    reviewerRole: "MERCHANT",
    orderId,
    decision,
    reason: parsed.data.reason ?? null,
  });
}

export async function recordFullRefundAction(orderId: string, formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({
    reference: z.string().trim().min(3).max(120),
    reason: z.string().trim().min(10).max(500),
  }).safeParse({ reference: formData.get("reference"), reason: formData.get("reason") });
  if (!parsed.success) redirect("/admin/transactions?error=Referensi+dan+alasan+refund+wajib+diisi");

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`order:${orderId}`}))`);
    const [row] = await tx.select({ order: orders, merchantId: products.merchantId }).from(orders)
      .innerJoin(products, eq(orders.productId, products.id)).where(eq(orders.id, orderId)).limit(1);
    if (!row || row.order.status !== "PAID" || !row.order.customerId) throw new Error("ORDER_NOT_REFUNDABLE");

    const merchantNet = row.order.merchantNetAmount ?? row.order.amount;
    if (row.order.settlementMode === "MERCHANT_DIRECT") {
      const fee = row.order.platformFeeAmount ?? 0;
      if (fee > 0) await tx.insert(platformReceivableEntries).values({
        merchantId: row.merchantId, orderId: row.order.id, type: "MANUAL_SALE_FEE_REVERSAL", amount: -fee,
        description: `Pembalikan komisi refund ${row.order.externalId}`, createdBy: admin.id,
      }).onConflictDoNothing({ target: [platformReceivableEntries.orderId, platformReceivableEntries.type] });
    } else {
      await tx.insert(merchantLedgerEntries).values({
        merchantId: row.merchantId, orderId: row.order.id, type: "REFUND", amount: -merchantNet,
        description: `Refund penuh ${row.order.externalId}`, createdBy: admin.id,
      }).onConflictDoNothing({ target: [merchantLedgerEntries.orderId, merchantLedgerEntries.type] });
    }
    await tx.delete(enrollments).where(eq(enrollments.orderId, row.order.id));
    await tx.update(orders).set({
      status: "REFUNDED", refundedAt: new Date(), refundAmount: row.order.amount,
      refundReference: parsed.data.reference, refundReason: parsed.data.reason, refundedBy: admin.id, updatedAt: new Date(),
    }).where(and(eq(orders.id, row.order.id), eq(orders.status, "PAID")));
    await tx.insert(auditLogs).values({
      actorId: admin.id, action: "ORDER_FULL_REFUND_RECORDED", entityType: "ORDER", entityId: row.order.id,
      metadata: { amount: row.order.amount, merchantNetReversed: row.order.settlementMode === "PLATFORM" ? merchantNet : 0, feeReceivableReversed: row.order.settlementMode === "MERCHANT_DIRECT" ? row.order.platformFeeAmount ?? 0 : 0, settlementMode: row.order.settlementMode, reference: parsed.data.reference },
    });
    await tx.insert(inAppNotifications).values({
      userId: row.order.customerId, actorId: admin.id, type: "ORDER_REFUNDED", title: "Pesanan telah direfund",
      body: `Refund untuk ${row.order.externalId} telah dicatat.`, href: "/member/orders", dedupeKey: `order-refund:${row.order.id}`,
    }).onConflictDoNothing({ target: inAppNotifications.dedupeKey });
  }).catch((error) => {
    if (error instanceof Error && error.message === "ORDER_NOT_REFUNDABLE") redirect("/admin/transactions?error=Pesanan+tidak+dapat+direfund+atau+sudah+diproses");
    throw error;
  });

  revalidatePath("/admin");
  revalidatePath("/admin/transactions");
  revalidatePath("/dashboard/finance");
  revalidatePath("/member");
  revalidatePath("/member/orders");
  redirect("/admin/transactions?success=Refund+penuh+berhasil+dicatat+dan+akses+kelas+dicabut");
}
