"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { featureFlagDefinitions } from "@/lib/feature-flags";
import { merchantControlUpdateSchema } from "@/lib/merchant-control";
import { auditLogs, merchantProfiles, platformFeatureFlags, platformSettings, productReviews, products, users } from "@/lib/schema";

function merchantEditPath(merchantId: string, message: string, type: "error" | "success") {
  return `/admin/merchants/${merchantId}?${type}=${encodeURIComponent(message)}`;
}

function databaseErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  if ("cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause && typeof error.cause.code === "string") return error.cause.code;
  return undefined;
}

export async function updateMerchantControlAction(merchantId: string, formData: FormData) {
  const admin = await requireAdmin();
  const parsedMerchantId = z.string().uuid().safeParse(merchantId);
  if (!parsedMerchantId.success) redirect("/admin/merchants?error=Merchant+tidak+valid");

  const parsed = merchantControlUpdateSchema.safeParse({
    ownerName: formData.get("ownerName"),
    loginEmail: formData.get("loginEmail"),
    supportEmail: formData.get("supportEmail"),
    status: formData.get("status"),
    feePercent: formData.get("feePercent"),
  });
  if (!parsed.success) redirect(merchantEditPath(merchantId, "Periksa kembali nama, email, status, dan komisi merchant", "error"));
  const plan = z.enum(["STARTER", "PRO", "BUSINESS"]).safeParse(formData.get("plan"));
  if (!plan.success) redirect(merchantEditPath(merchantId, "Paket merchant tidak valid", "error"));

  const [current] = await db.select({ user: users, profile: merchantProfiles }).from(users)
    .innerJoin(merchantProfiles, eq(merchantProfiles.userId, users.id))
    .where(and(eq(users.id, merchantId), eq(users.role, "MERCHANT"))).limit(1);
  if (!current) redirect("/admin/merchants?error=Merchant+tidak+ditemukan");

  const [duplicateEmail] = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.email, parsed.data.loginEmail), ne(users.id, merchantId))).limit(1);
  if (duplicateEmail) redirect(merchantEditPath(merchantId, "Email login sudah digunakan akun lain", "error"));

  const changedFields = [
    current.user.name !== parsed.data.ownerName && "ownerName",
    current.user.email !== parsed.data.loginEmail && "loginEmail",
    current.profile.supportEmail !== parsed.data.supportEmail && "supportEmail",
    current.profile.status !== parsed.data.status && "status",
    current.profile.platformFeeBps !== parsed.data.platformFeeBps && "platformFeeBps",
    current.profile.plan !== plan.data && "plan",
  ].filter((field): field is string => Boolean(field));

  if (changedFields.length === 0) redirect(merchantEditPath(merchantId, "Tidak ada perubahan untuk disimpan", "success"));

  try {
    await db.transaction(async (tx) => {
      await tx.update(users).set({
        name: parsed.data.ownerName,
        email: parsed.data.loginEmail,
        updatedAt: new Date(),
      }).where(and(eq(users.id, merchantId), eq(users.role, "MERCHANT")));
      await tx.update(merchantProfiles).set({
        supportEmail: parsed.data.supportEmail,
        status: parsed.data.status,
        platformFeeBps: parsed.data.platformFeeBps,
        plan: plan.data,
        updatedAt: new Date(),
      }).where(eq(merchantProfiles.userId, merchantId));
      const workspaceStatus = parsed.data.status === "ACTIVE" ? "ACTIVE" : parsed.data.status === "SUSPENDED" ? "SUSPENDED" : "DRAFT";
      await tx.execute(sql`
        update workspaces set status = ${workspaceStatus}::workspace_status, updated_at = now()
        where id in (
          select workspace_id from legacy_merchant_workspace_links
          where legacy_merchant_user_id = ${merchantId}
        )
      `);
      await tx.insert(auditLogs).values({
        actorId: admin.id,
        action: "MERCHANT_CONTROL_UPDATED",
        entityType: "MERCHANT",
        entityId: merchantId,
        metadata: {
          changedFields,
          status: parsed.data.status,
          platformFeeBps: parsed.data.platformFeeBps,
          plan: plan.data,
        },
      });
    });
  } catch (error) {
    if (databaseErrorCode(error) === "23505") redirect(merchantEditPath(merchantId, "Email login sudah digunakan akun lain", "error"));
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/merchants");
  revalidatePath(`/admin/merchants/${merchantId}`);
  revalidatePath("/admin/audit");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  redirect(merchantEditPath(merchantId, "Data kontrol merchant berhasil diperbarui", "success"));
}

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
    const workspaceStatus = parsedStatus === "ACTIVE" ? "ACTIVE" : parsedStatus === "SUSPENDED" ? "SUSPENDED" : "DRAFT";
    await tx.execute(sql`
      update workspaces set status = ${workspaceStatus}::workspace_status, updated_at = now()
      where id in (
        select workspace_id from legacy_merchant_workspace_links
        where legacy_merchant_user_id = ${merchant.id}
      )
    `);
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
    commissionBankName: z.string().trim().max(80).optional(),
    commissionAccountNumber: z.string().trim().regex(/^\d{6,30}$/).or(z.literal("")),
    commissionAccountHolder: z.string().trim().max(100).optional(),
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
      commissionBankName: parsed.data.commissionBankName || null,
      commissionAccountNumber: parsed.data.commissionAccountNumber || null,
      commissionAccountHolder: parsed.data.commissionAccountHolder || null,
      updatedBy: admin.id,
    }).onConflictDoUpdate({
      target: platformSettings.id,
      set: {
        defaultPlatformFeeBps,
        minimumPayoutAmount: parsed.data.minimumPayoutAmount,
        commissionBankName: parsed.data.commissionBankName || null,
        commissionAccountNumber: parsed.data.commissionAccountNumber || null,
        commissionAccountHolder: parsed.data.commissionAccountHolder || null,
        updatedBy: admin.id,
        updatedAt: new Date(),
      },
    });
    await tx.insert(auditLogs).values({
      actorId: admin.id,
      action: "PLATFORM_FINANCE_SETTINGS_UPDATED",
      entityType: "PLATFORM_SETTINGS",
      entityId: "1",
      metadata: { defaultPlatformFeeBps, minimumPayoutAmount: parsed.data.minimumPayoutAmount, commissionBankConfigured: Boolean(parsed.data.commissionAccountNumber) },
    });
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/merchants");
  redirect("/admin/settings?success=Pengaturan+keuangan+berhasil+disimpan");
}

export async function updateFeatureFlagAction(flagKey: string, formData: FormData) {
  const admin = await requireAdmin();
  const allowedKeys = featureFlagDefinitions.map((flag) => flag.key);
  const parsed = z.object({
    key: z.enum(allowedKeys as [typeof allowedKeys[number], ...typeof allowedKeys[number][]]),
    rollout: z.enum(["OFF", "ALL", "USERS"]),
    audienceUserIds: z.string().trim().max(5000).optional(),
  }).safeParse({ key: flagKey, rollout: formData.get("rollout"), audienceUserIds: formData.get("audienceUserIds") });
  if (!parsed.success) redirect("/admin/settings?error=Konfigurasi+feature+flag+tidak+valid");
  const definition = featureFlagDefinitions.find((flag) => flag.key === parsed.data.key)!;
  const audienceUserIds = [...new Set((parsed.data.audienceUserIds ?? "").split(/[\s,]+/).map((value) => value.trim()).filter(Boolean))];
  if (parsed.data.rollout === "USERS" && audienceUserIds.length === 0) redirect("/admin/settings?error=Isi+minimal+satu+User+ID+untuk+mode+canary");
  if (audienceUserIds.some((value) => !z.string().uuid().safeParse(value).success)) redirect("/admin/settings?error=Daftar+User+ID+canary+tidak+valid");

  await db.transaction(async (tx) => {
    await tx.insert(platformFeatureFlags).values({
      key: definition.key,
      name: definition.name,
      description: definition.description,
      rollout: parsed.data.rollout,
      audienceUserIds,
      updatedBy: admin.id,
    }).onConflictDoUpdate({
      target: platformFeatureFlags.key,
      set: { rollout: parsed.data.rollout, audienceUserIds, updatedBy: admin.id, updatedAt: new Date() },
    });
    await tx.insert(auditLogs).values({
      actorId: admin.id,
      action: "FEATURE_FLAG_UPDATED",
      entityType: "FEATURE_FLAG",
      entityId: definition.key,
      metadata: { rollout: parsed.data.rollout, audienceCount: audienceUserIds.length },
    });
  });
  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  redirect(`/admin/settings?success=${encodeURIComponent(`${definition.name} berhasil diperbarui`)}`);
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

export async function toggleMerchantVerificationAction(merchantId: string, verified: boolean) {
  const admin = await requireAdmin();
  const [profile] = await db.update(merchantProfiles).set({ isVerified: verified, updatedAt: new Date() })
    .where(eq(merchantProfiles.userId, merchantId)).returning({ id: merchantProfiles.id });
  if (!profile) redirect("/admin/merchants?error=Merchant+tidak+ditemukan");
  await db.insert(auditLogs).values({ actorId: admin.id, action: verified ? "MERCHANT_VERIFIED" : "MERCHANT_UNVERIFIED", entityType: "MERCHANT", entityId: merchantId });
  revalidatePath("/admin/merchants");
  revalidatePath("/marketplace");
}

export async function toggleProductFeaturedAction(productId: string, featured: boolean) {
  const admin = await requireAdmin();
  const [product] = await db.update(products).set({ isFeatured: featured, updatedAt: new Date() })
    .where(eq(products.id, productId)).returning({ id: products.id });
  if (!product) redirect("/admin/products?error=Produk+tidak+ditemukan");
  await db.insert(auditLogs).values({ actorId: admin.id, action: featured ? "PRODUCT_FEATURED" : "PRODUCT_UNFEATURED", entityType: "PRODUCT", entityId: productId });
  revalidatePath("/admin/products");
  revalidatePath("/marketplace");
}

export async function moderateProductReviewAction(reviewId: string, status: "PUBLISHED" | "HIDDEN") {
  const admin = await requireAdmin();
  const parsedStatus = z.enum(["PUBLISHED", "HIDDEN"]).parse(status);
  const [review] = await db.update(productReviews).set({ status: parsedStatus, updatedAt: new Date() })
    .where(eq(productReviews.id, reviewId)).returning({ id: productReviews.id, productId: productReviews.productId });
  if (!review) redirect("/admin/reviews?error=Ulasan+tidak+ditemukan");
  await db.insert(auditLogs).values({ actorId: admin.id, action: `REVIEW_${parsedStatus}`, entityType: "PRODUCT_REVIEW", entityId: reviewId });
  revalidatePath("/admin/reviews");
  revalidatePath("/marketplace");
}
