"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_MINIMUM_PAYOUT } from "@/lib/finance";
import { auditLogs, merchantLedgerEntries, merchantPayoutAccounts, merchantPayouts, merchantProfiles, platformSettings } from "@/lib/schema";

class FinanceActionError extends Error {}

export async function updatePayoutAccountAction(formData: FormData) {
  const merchant = await requireMerchant();
  if (merchant.role !== "MERCHANT") redirect("/admin");
  const parsed = z.object({
    bankName: z.string().trim().min(2).max(80),
    accountNumber: z.string().trim().regex(/^[0-9]{6,30}$/),
    accountHolder: z.string().trim().min(2).max(100),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/dashboard/finance?error=Periksa+kembali+data+rekening+pencairan");

  await db.insert(merchantPayoutAccounts).values({ merchantId: merchant.id, ...parsed.data })
    .onConflictDoUpdate({
      target: merchantPayoutAccounts.merchantId,
      set: { ...parsed.data, updatedAt: new Date() },
    });
  await db.insert(auditLogs).values({
    actorId: merchant.id,
    action: "PAYOUT_ACCOUNT_UPDATED",
    entityType: "MERCHANT",
    entityId: merchant.id,
  });
  revalidatePath("/dashboard/finance");
  redirect("/dashboard/finance?success=Rekening+pencairan+berhasil+disimpan");
}

export async function requestPayoutAction(formData: FormData) {
  const merchant = await requireMerchant();
  if (merchant.role !== "MERCHANT") redirect("/admin");
  const parsed = z.object({
    amount: z.coerce.number().int().positive().max(2_000_000_000),
    note: z.string().trim().max(300).optional(),
  }).safeParse({ amount: formData.get("amount"), note: formData.get("note") || undefined });
  if (!parsed.success) redirect("/dashboard/finance?error=Nominal+pencairan+tidak+valid");

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${merchant.id}))`);
      const [[profile], [account], [settings], [balanceRow]] = await Promise.all([
        tx.select({ status: merchantProfiles.status }).from(merchantProfiles).where(eq(merchantProfiles.userId, merchant.id)).limit(1),
        tx.select().from(merchantPayoutAccounts).where(eq(merchantPayoutAccounts.merchantId, merchant.id)).limit(1),
        tx.select({ minimum: platformSettings.minimumPayoutAmount }).from(platformSettings).where(eq(platformSettings.id, 1)).limit(1),
        tx.select({ balance: sql<number>`coalesce(sum(${merchantLedgerEntries.amount}), 0)::integer` })
          .from(merchantLedgerEntries).where(eq(merchantLedgerEntries.merchantId, merchant.id)),
      ]);
      const minimum = settings?.minimum ?? DEFAULT_MINIMUM_PAYOUT;
      const balance = Number(balanceRow?.balance ?? 0);
      if (!profile || profile.status !== "ACTIVE") throw new FinanceActionError("Akun merchant belum aktif");
      if (!account) throw new FinanceActionError("Simpan rekening pencairan terlebih dahulu");
      if (parsed.data.amount < minimum) throw new FinanceActionError(`Minimum pencairan adalah Rp${minimum.toLocaleString("id-ID")}`);
      if (parsed.data.amount > balance) throw new FinanceActionError("Saldo tidak mencukupi");

      const [payout] = await tx.insert(merchantPayouts).values({
        merchantId: merchant.id,
        amount: parsed.data.amount,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        accountHolder: account.accountHolder,
        merchantNote: parsed.data.note || null,
      }).returning({ id: merchantPayouts.id });
      await tx.insert(merchantLedgerEntries).values({
        merchantId: merchant.id,
        payoutId: payout.id,
        type: "PAYOUT",
        amount: -parsed.data.amount,
        description: "Saldo dicadangkan untuk permintaan pencairan",
        createdBy: merchant.id,
      });
      await tx.insert(auditLogs).values({
        actorId: merchant.id,
        action: "PAYOUT_REQUESTED",
        entityType: "PAYOUT",
        entityId: payout.id,
        metadata: { amount: parsed.data.amount },
      });
    });
  } catch (error) {
    if (error instanceof FinanceActionError) redirect(`/dashboard/finance?error=${encodeURIComponent(error.message)}`);
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
  revalidatePath("/admin/payouts");
  redirect("/dashboard/finance?success=Permintaan+pencairan+berhasil+dikirim");
}

export async function reviewPayoutAction(payoutId: string, decision: "pay" | "reject", formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({
    adminNote: z.string().trim().max(500).optional(),
    transferReference: z.string().trim().max(120).optional(),
  }).safeParse({
    adminNote: formData.get("adminNote") || undefined,
    transferReference: formData.get("transferReference") || undefined,
  });
  if (!parsed.success || (decision === "pay" && !parsed.data.transferReference)) {
    redirect("/admin/payouts?error=Referensi+transfer+wajib+diisi+untuk+pencairan+yang+dibayar");
  }

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${payoutId}))`);
      const [payout] = await tx.select().from(merchantPayouts)
        .where(and(eq(merchantPayouts.id, payoutId), eq(merchantPayouts.status, "REQUESTED"))).limit(1);
      if (!payout) throw new FinanceActionError("Permintaan sudah diproses atau tidak ditemukan");

      await tx.update(merchantPayouts).set({
        status: decision === "pay" ? "PAID" : "REJECTED",
        adminNote: parsed.data.adminNote || null,
        transferReference: decision === "pay" ? parsed.data.transferReference : null,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
        paidAt: decision === "pay" ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(merchantPayouts.id, payout.id));

      if (decision === "reject") {
        await tx.insert(merchantLedgerEntries).values({
          merchantId: payout.merchantId,
          payoutId: payout.id,
          type: "PAYOUT_REVERSAL",
          amount: payout.amount,
          description: "Saldo dikembalikan karena pencairan ditolak",
          createdBy: admin.id,
        }).onConflictDoNothing({ target: [merchantLedgerEntries.payoutId, merchantLedgerEntries.type] });
      }
      await tx.insert(auditLogs).values({
        actorId: admin.id,
        action: decision === "pay" ? "PAYOUT_MARKED_PAID" : "PAYOUT_REJECTED",
        entityType: "PAYOUT",
        entityId: payout.id,
        metadata: { amount: payout.amount, merchantId: payout.merchantId },
      });
    });
  } catch (error) {
    if (error instanceof FinanceActionError) redirect(`/admin/payouts?error=${encodeURIComponent(error.message)}`);
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/payouts");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
  redirect("/admin/payouts?success=Pencairan+berhasil+diproses");
}
