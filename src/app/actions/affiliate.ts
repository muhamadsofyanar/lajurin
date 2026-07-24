"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireMerchant, requireUser } from "@/lib/auth";
import { AffiliatePayoutError, reserveAffiliatePayout, settleAffiliatePayout } from "@/lib/affiliate-payout";
import { db } from "@/lib/db";
import { affiliateCommissions, affiliatePartners, affiliatePrograms, auditLogs, products, users } from "@/lib/schema";

export async function saveAffiliateProgramAction(productId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({
    commissionPercent: z.coerce.number().int().min(1).max(80),
    isActive: z.preprocess((value) => value === "on", z.boolean()),
  }).safeParse(Object.fromEntries(formData));
  const [product] = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!parsed.success || !product) redirect("/dashboard/affiliates?error=Data+program+affiliate+tidak+valid");
  await db.insert(affiliatePrograms).values({
    productId,
    commissionBps: parsed.data.commissionPercent * 100,
    isActive: parsed.data.isActive,
  }).onConflictDoUpdate({
    target: affiliatePrograms.productId,
    set: { commissionBps: parsed.data.commissionPercent * 100, isActive: parsed.data.isActive, updatedAt: new Date() },
  });
  revalidatePath("/dashboard/affiliates");
  redirect("/dashboard/affiliates?success=Program+affiliate+berhasil+disimpan");
}

export async function addAffiliatePartnerAction(programId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({ email: z.string().email().transform((value) => value.toLowerCase().trim()) })
    .safeParse(Object.fromEntries(formData));
  const [program] = await db.select({ id: affiliatePrograms.id }).from(affiliatePrograms)
    .innerJoin(products, eq(products.id, affiliatePrograms.productId))
    .where(and(eq(affiliatePrograms.id, programId), eq(products.merchantId, merchant.id))).limit(1);
  if (!parsed.success || !program) redirect("/dashboard/affiliates?error=Program+atau+email+tidak+valid");
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user) redirect("/dashboard/affiliates?error=Email+belum+memiliki+akun+Rizqhub");
  await db.insert(affiliatePartners).values({
    programId,
    userId: user.id,
    code: `RQ-${randomBytes(6).toString("hex")}`,
  }).onConflictDoNothing({ target: [affiliatePartners.programId, affiliatePartners.userId] });
  revalidatePath("/dashboard/affiliates");
  revalidatePath("/member/affiliates");
  redirect("/dashboard/affiliates?success=Mitra+affiliate+berhasil+ditambahkan");
}

export async function markAffiliateCommissionPaidAction(commissionId: string) {
  const merchant = await requireMerchant("finance");
  const [owned] = await db.select({ id: affiliateCommissions.id }).from(affiliateCommissions)
    .innerJoin(affiliatePartners, eq(affiliatePartners.id, affiliateCommissions.partnerId))
    .innerJoin(affiliatePrograms, eq(affiliatePrograms.id, affiliatePartners.programId))
    .innerJoin(products, eq(products.id, affiliatePrograms.productId))
    .where(and(eq(affiliateCommissions.id, commissionId), eq(products.merchantId, merchant.id))).limit(1);
  if (!owned) return;
  await db.update(affiliateCommissions).set({ status: "PAID", paidAt: new Date(), updatedAt: new Date() })
    .where(and(eq(affiliateCommissions.id, commissionId), eq(affiliateCommissions.status, "PENDING")));
  revalidatePath("/dashboard/affiliates");
  revalidatePath("/member/affiliates");
}

export async function requestAffiliatePayoutAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({
    bankName: z.string().trim().min(2).max(80),
    accountNumber: z.string().trim().regex(/^\d{6,30}$/),
    accountHolder: z.string().trim().min(3).max(100),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/member/affiliates?error=Periksa+kembali+data+rekening");

  try {
    await db.transaction(async (tx) => {
      const request = await reserveAffiliatePayout(tx, user.id, parsed.data);
      await tx.insert(auditLogs).values({
        actorId: user.id,
        action: "AFFILIATE_PAYOUT_REQUESTED",
        entityType: "AFFILIATE_PAYOUT",
        entityId: request.id,
        metadata: { amount: request.amount },
      });
    });
  } catch (error) {
    if (error instanceof AffiliatePayoutError) {
      redirect(`/member/affiliates?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidatePath("/member/affiliates");
  revalidatePath("/admin/affiliate-payouts");
  redirect("/member/affiliates?success=Permintaan+pencairan+berhasil+dikirim");
}

export async function reviewAffiliatePayoutAction(requestId: string, decision: "PAID" | "REJECTED", formData: FormData) {
  const admin = await requireAdmin();
  const parsedDecision = z.enum(["PAID", "REJECTED"]).parse(decision);
  const note = z.string().trim().min(3).max(500).safeParse(formData.get("note"));
  if (!note.success) redirect("/admin/affiliate-payouts?error=Catatan+keputusan+wajib+diisi");
  try {
    await db.transaction(async (tx) => {
      const request = await settleAffiliatePayout(tx, requestId, parsedDecision, {
        adminId: admin.id,
        note: note.data,
      });
      await tx.insert(auditLogs).values({
        actorId: admin.id,
        action: `AFFILIATE_PAYOUT_${parsedDecision}`,
        entityType: "AFFILIATE_PAYOUT",
        entityId: request.id,
        metadata: { amount: request.amount, userId: request.userId },
      });
    });
  } catch (error) {
    if (error instanceof AffiliatePayoutError) {
      redirect(`/admin/affiliate-payouts?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidatePath("/admin/affiliate-payouts");
  revalidatePath("/member/affiliates");
  redirect("/admin/affiliate-payouts?success=Permintaan+pencairan+berhasil+diproses");
}
