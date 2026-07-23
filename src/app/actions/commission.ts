"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { featureEnabled, requireFeature } from "@/lib/feature-flags";
import { auditLogs, commissionPayments, inAppNotifications, platformReceivableEntries, platformSettings, users } from "@/lib/schema";
import { currentRequestIdentity, enforceRateLimit, verifyUploadSignature } from "@/lib/security";
import { commissionProofDirectory, commissionProofPath } from "@/lib/storage";

const proofTypes: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };

export async function submitCommissionPaymentAction(formData: FormData) {
  const merchant = await requireMerchant("finance");
  await requireFeature("COMMISSION_BILLING", merchant.id);
  const rateLimit = await enforceRateLimit(await currentRequestIdentity("commission-proof", merchant.id), { limit: 5, windowMs: 30 * 60_000, blockMs: 60 * 60_000 });
  if (rateLimit.limited) redirect("/dashboard/commissions?error=Terlalu+banyak+percobaan.+Coba+lagi+nanti");
  const parsed = z.object({ amount: z.coerce.number().int().positive().max(2_000_000_000), note: z.string().trim().max(500).optional() }).safeParse({ amount: formData.get("amount"), note: formData.get("note") || undefined });
  const proof = formData.get("proof");
  if (!parsed.success || !(proof instanceof File) || !proofTypes[proof.type] || proof.size < 1 || proof.size > 3 * 1024 * 1024) redirect("/dashboard/commissions?error=Nominal+atau+bukti+pembayaran+tidak+valid");
  const [[settings], [{ due }], [pending]] = await Promise.all([
    db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1),
    db.select({ due: sql<number>`coalesce(sum(${platformReceivableEntries.amount}), 0)::integer` }).from(platformReceivableEntries).where(eq(platformReceivableEntries.merchantId, merchant.id)),
    db.select({ id: commissionPayments.id }).from(commissionPayments).where(and(eq(commissionPayments.merchantId, merchant.id), eq(commissionPayments.status, "SUBMITTED"))).limit(1),
  ]);
  if (!settings?.commissionBankName || !settings.commissionAccountNumber || !settings.commissionAccountHolder) redirect("/dashboard/commissions?error=Rekening+komisi+platform+belum+dikonfigurasi");
  if (pending) redirect("/dashboard/commissions?error=Masih+ada+pembayaran+yang+menunggu+verifikasi");
  if (parsed.data.amount > Number(due)) redirect("/dashboard/commissions?error=Nominal+melebihi+tagihan+komisi");
  const buffer = Buffer.from(await proof.arrayBuffer());
  if (!verifyUploadSignature(buffer, proof.type)) redirect("/dashboard/commissions?error=Isi+file+bukti+tidak+valid");
  const fileName = `${merchant.id}-${randomUUID()}${proofTypes[proof.type]}`;
  const notificationsEnabled = await featureEnabled("BASIC_NOTIFICATIONS", merchant.id);
  await mkdir(commissionProofDirectory, { recursive: true });
  await writeFile(commissionProofPath(fileName), buffer, { flag: "wx" });
  try {
    await db.transaction(async (tx) => {
      const [payment] = await tx.insert(commissionPayments).values({ merchantId: merchant.id, amount: parsed.data.amount, proofFileName: fileName, destinationBank: settings.commissionBankName!, destinationAccount: settings.commissionAccountNumber!, destinationHolder: settings.commissionAccountHolder!, merchantNote: parsed.data.note || null }).returning({ id: commissionPayments.id });
      await tx.insert(auditLogs).values({ actorId: merchant.id, action: "COMMISSION_PAYMENT_SUBMITTED", entityType: "COMMISSION_PAYMENT", entityId: payment.id, metadata: { amount: parsed.data.amount } });
      if (notificationsEnabled) {
        const admins = await tx.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN"));
        if (admins.length) await tx.insert(inAppNotifications).values(admins.map((admin) => ({ userId: admin.id, actorId: merchant.id, type: "COMMISSION_PAYMENT_SUBMITTED", title: "Pelunasan komisi menunggu verifikasi", body: `Merchant mengirim pembayaran komisi senilai Rp${parsed.data.amount.toLocaleString("id-ID")}.`, href: "/admin/commissions", dedupeKey: `commission-payment:${payment.id}:${admin.id}` })));
      }
    });
  } catch (error) {
    await unlink(commissionProofPath(fileName)).catch(() => undefined);
    throw error;
  }
  revalidatePath("/dashboard/commissions");
  revalidatePath("/admin/commissions");
  redirect("/dashboard/commissions?success=Bukti+pelunasan+komisi+berhasil+dikirim");
}

export async function reviewCommissionPaymentAction(paymentId: string, decision: "approve" | "reject", formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({ decision: z.enum(["approve", "reject"]), note: z.string().trim().min(5).max(500) }).safeParse({ decision, note: formData.get("note") });
  if (!parsed.success || !z.string().uuid().safeParse(paymentId).success) redirect("/admin/commissions?error=Keputusan+dan+catatan+wajib+diisi");
  const [notificationTarget] = await db.select({ merchantId: commissionPayments.merchantId }).from(commissionPayments).where(eq(commissionPayments.id, paymentId)).limit(1);
  const notificationsEnabled = notificationTarget ? await featureEnabled("BASIC_NOTIFICATIONS", notificationTarget.merchantId) : false;
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`commission-payment:${paymentId}`}))`);
      const [payment] = await tx.select().from(commissionPayments).where(eq(commissionPayments.id, paymentId)).limit(1);
      if (!payment || payment.status !== "SUBMITTED") throw new Error("PAYMENT_ALREADY_REVIEWED");
      if (parsed.data.decision === "approve") {
        const [{ due }] = await tx.select({ due: sql<number>`coalesce(sum(${platformReceivableEntries.amount}), 0)::integer` }).from(platformReceivableEntries).where(eq(platformReceivableEntries.merchantId, payment.merchantId));
        if (payment.amount > Number(due)) throw new Error("PAYMENT_EXCEEDS_DUE");
        await tx.insert(platformReceivableEntries).values({ merchantId: payment.merchantId, type: "PAYMENT", amount: -payment.amount, description: `Pelunasan komisi ${payment.id}`, createdBy: admin.id });
      }
      await tx.update(commissionPayments).set({ status: parsed.data.decision === "approve" ? "APPROVED" : "REJECTED", adminNote: parsed.data.note, reviewedBy: admin.id, reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(commissionPayments.id, payment.id), eq(commissionPayments.status, "SUBMITTED")));
      await tx.insert(auditLogs).values({ actorId: admin.id, action: parsed.data.decision === "approve" ? "COMMISSION_PAYMENT_APPROVED" : "COMMISSION_PAYMENT_REJECTED", entityType: "COMMISSION_PAYMENT", entityId: payment.id, metadata: { amount: payment.amount, note: parsed.data.note } });
      if (notificationsEnabled) await tx.insert(inAppNotifications).values({ userId: payment.merchantId, actorId: admin.id, type: `COMMISSION_PAYMENT_${parsed.data.decision === "approve" ? "APPROVED" : "REJECTED"}`, title: parsed.data.decision === "approve" ? "Pelunasan komisi disetujui" : "Pelunasan komisi ditolak", body: parsed.data.note, href: "/dashboard/commissions", dedupeKey: `commission-review:${payment.id}` });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_ALREADY_REVIEWED") redirect("/admin/commissions?error=Pembayaran+sudah+ditinjau");
    if (error instanceof Error && error.message === "PAYMENT_EXCEEDS_DUE") redirect("/admin/commissions?error=Nominal+melebihi+sisa+tagihan+merchant");
    throw error;
  }
  revalidatePath("/admin/commissions");
  revalidatePath("/dashboard/commissions");
  revalidatePath("/dashboard/finance");
  redirect(`/admin/commissions?success=${parsed.data.decision === "approve" ? "Pembayaran+disetujui" : "Pembayaran+ditolak"}`);
}
