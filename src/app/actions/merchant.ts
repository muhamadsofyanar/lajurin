"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { merchantProfiles, productLandingPages, products } from "@/lib/schema";

const optionalHttpUrl = z.union([
  z.literal(""),
  z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
]);

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export async function updateMerchantProfileAction(formData: FormData) {
  const merchant = await requireMerchant();
  const parsed = z.object({
    brandName: z.string().trim().min(2).max(100),
    slug: z.string().trim().min(3).max(80).transform(slugify),
    headline: z.string().trim().max(180).optional(),
    bio: z.string().trim().max(1500).optional(),
    logoUrl: optionalHttpUrl,
    supportEmail: z.union([z.literal(""), z.string().email()]),
    whatsapp: z.string().trim().max(20).optional(),
    accentColor: colorSchema,
  }).safeParse(Object.fromEntries(formData));

  if (!parsed.success || parsed.data.slug.length < 3) {
    redirect("/dashboard/profile?error=Periksa+kembali+data+profil+toko");
  }

  const [duplicate] = await db.select({ id: merchantProfiles.id }).from(merchantProfiles)
    .where(and(eq(merchantProfiles.slug, parsed.data.slug), ne(merchantProfiles.userId, merchant.id))).limit(1);
  if (duplicate) redirect("/dashboard/profile?error=Alamat+toko+sudah+digunakan");

  await db.insert(merchantProfiles).values({
    userId: merchant.id,
    brandName: parsed.data.brandName,
    slug: parsed.data.slug,
    headline: parsed.data.headline || null,
    bio: parsed.data.bio || null,
    logoUrl: parsed.data.logoUrl || null,
    supportEmail: parsed.data.supportEmail || null,
    whatsapp: parsed.data.whatsapp || null,
    accentColor: parsed.data.accentColor.toLowerCase(),
  }).onConflictDoUpdate({
    target: merchantProfiles.userId,
    set: {
      brandName: parsed.data.brandName,
      slug: parsed.data.slug,
      headline: parsed.data.headline || null,
      bio: parsed.data.bio || null,
      logoUrl: parsed.data.logoUrl || null,
      supportEmail: parsed.data.supportEmail || null,
      whatsapp: parsed.data.whatsapp || null,
      accentColor: parsed.data.accentColor.toLowerCase(),
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath(`/m/${parsed.data.slug}`);
  redirect("/dashboard/profile?success=Profil+toko+berhasil+disimpan");
}

export async function updateLandingPageAction(productId: string, formData: FormData) {
  const merchant = await requireMerchant();
  const parsed = z.object({
    eyebrow: z.string().trim().max(80).optional(),
    heroTitle: z.string().trim().max(180).optional(),
    heroSubtitle: z.string().trim().max(1000).optional(),
    coverImageUrl: optionalHttpUrl,
    benefitsText: z.string().trim().max(3000).optional(),
    audienceText: z.string().trim().max(1500).optional(),
    ctaText: z.string().trim().min(2).max(60),
    accentColor: colorSchema,
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/dashboard/products/${productId}/landing?error=Periksa+kembali+isi+landing+page`);

  const [ownedProduct] = await db.select({ id: products.id, slug: products.slug }).from(products)
    .where(and(eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!ownedProduct) redirect("/dashboard");

  await db.insert(productLandingPages).values({
    productId: ownedProduct.id,
    eyebrow: parsed.data.eyebrow || null,
    heroTitle: parsed.data.heroTitle || null,
    heroSubtitle: parsed.data.heroSubtitle || null,
    coverImageUrl: parsed.data.coverImageUrl || null,
    benefitsText: parsed.data.benefitsText || null,
    audienceText: parsed.data.audienceText || null,
    ctaText: parsed.data.ctaText,
    accentColor: parsed.data.accentColor.toLowerCase(),
  }).onConflictDoUpdate({
    target: productLandingPages.productId,
    set: {
      eyebrow: parsed.data.eyebrow || null,
      heroTitle: parsed.data.heroTitle || null,
      heroSubtitle: parsed.data.heroSubtitle || null,
      coverImageUrl: parsed.data.coverImageUrl || null,
      benefitsText: parsed.data.benefitsText || null,
      audienceText: parsed.data.audienceText || null,
      ctaText: parsed.data.ctaText,
      accentColor: parsed.data.accentColor.toLowerCase(),
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/products/${ownedProduct.id}/landing`);
  revalidatePath(`/p/${ownedProduct.slug}`);
  redirect(`/dashboard/products/${ownedProduct.id}/landing?success=Landing+page+berhasil+disimpan`);
}
