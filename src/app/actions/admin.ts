"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, merchantProfiles, platformSettings, products, users } from "@/lib/schema";

export async function updateMerchantStatusAction(merchantId: string, status: "PENDING" | "ACTIVE" | "SUSPENDED") {
  const admin = await requireAdmin();
  const parsedStatus = z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).parse(status);
  const [merchant] = await db.select({ id: users.id }).from(users)
    .innerJoin(merchantProfiles, eq(merchantProfiles.userId, users.id))
    .where(and(eq(users.id, merchantId), eq(users.role, "MERCHANT"))).limit(1);
  if (!merchant) redirect("/admin/merchants?error=Merchant+tidak+ditemukan");

  await db.transaction(async (tx) => {
    await tx.update(merchantProfiles).set({ status: parsedStatus, updatedAt: new Date() })
      .where(eq(merchantProfiles.userId, merchant.id));
    await tx.insert(auditLogs).values({
      actorId: admin.id,
      action: `MERCHANT_${parsedStatus}`,
      entityType: "MERCHANT",
      entityId: merchant.id,
    });
  });
  revalidatePath("/admin");
  revalidatePath("/admin/merchants");
  revalidatePath("/dashboard");
}

export async function updateMerchantFeeAction(merchantId: string, formData: FormData) {
  const admin = await requireAdmin();
  const raw = String(formData.get("feePercent") ?? "").trim();
  const feePercent = raw === "" ? null : Number(raw);
  if (feePercent !== null && (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100 || Math.abs(Math.round(feePercent * 100) - feePercent * 100) > 0.000001)) {
    redirect("/admin/merchants?error=Komisi+harus+0+sampai+100+persen,+maksimal+2+desimal");
  }
  const [profile] = await db.select({ id: merchantProfiles.id }).from(merchantProfiles)
    .where(eq(merchantProfiles.userId, merchantId)).limit(1);
  if (!profile) redirect("/admin/merchants?error=Merchant+tidak+ditemukan");

  const feeBps = feePercent === null ? null : Math.round(feePercent * 100);
  await db.transaction(async (tx) => {
    await tx.update(merchantProfiles).set({ platformFeeBps: feeBps, updatedAt: new Date() })
      .where(eq(merchantProfiles.userId, merchantId));
    await tx.insert(auditLogs).values({
      actorId: admin.id,
      action: "MERCHANT_FEE_UPDATED",
      entityType: "MERCHANT",
      entityId: merchantId,
      metadata: { feeBps },
    });
  });
  revalidatePath("/admin/merchants");
  redirect("/admin/merchants?success=Komisi+merchant+berhasil+diperbarui");
}

export async function updatePlatformSettingsAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({
    defaultFeePercent: z.coerce.number().min(0).max(100),
    minimumPayoutAmount: z.coerce.number().int().positive().max(2_000_000_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || Math.abs(Math.round(parsed.data.defaultFeePercent * 100) - parsed.data.defaultFeePercent * 100) > 0.000001) {
    redirect("/admin/settings?error=Periksa+kembali+komisi+dan+minimum+pencairan");
  }
  const defaultPlatformFeeBps = Math.round(parsed.data.defaultFeePercent * 100);
  await db.transaction(async (tx) => {
    await tx.insert(platformSettings).values({
      id: 1,
      defaultPlatformFeeBps,
      minimumPayoutAmount: parsed.data.minimumPayoutAmount,
      updatedBy: admin.id,
    }).onConflictDoUpdate({
      target: platformSettings.id,
      set: { defaultPlatformFeeBps, minimumPayoutAmount: parsed.data.minimumPayoutAmount, updatedBy: admin.id, updatedAt: new Date() },
    });
    await tx.insert(auditLogs).values({
      actorId: admin.id,
      action: "PLATFORM_FINANCE_SETTINGS_UPDATED",
      entityType: "PLATFORM_SETTINGS",
      entityId: "1",
      metadata: { defaultPlatformFeeBps, minimumPayoutAmount: parsed.data.minimumPayoutAmount },
    });
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/merchants");
  redirect("/admin/settings?success=Pengaturan+keuangan+berhasil+disimpan");
}

export async function updateProductStatusAdminAction(productId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const admin = await requireAdmin();
  const parsedStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).parse(status);
  const [product] = await db.select({ id: products.id, merchantId: products.merchantId }).from(products)
    .where(eq(products.id, productId)).limit(1);
  if (!product) redirect("/admin/products?error=Produk+tidak+ditemukan");
  await db.transaction(async (tx) => {
    await tx.update(products).set({ status: parsedStatus, updatedAt: new Date() }).where(eq(products.id, product.id));
    await tx.insert(auditLogs).values({
      actorId: admin.id,
      action: `PRODUCT_${parsedStatus}`,
      entityType: "PRODUCT",
      entityId: product.id,
      metadata: { merchantId: product.merchantId },
    });
  });
  revalidatePath("/admin/products");
  revalidatePath("/dashboard");
}
