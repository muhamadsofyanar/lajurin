"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { merchantProfiles, productLandingPages, products } from "@/lib/schema";
import { landingMediaDirectory, landingMediaPath } from "@/lib/storage";
import { verifyUploadSignature } from "@/lib/security";

const optionalHttpUrl = z.union([
  z.literal(""),
  z.string().regex(/^\/api\/landing-media\/[A-Za-z0-9._-]+$/),
  z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
]);

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const optionalInteger = z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().int().positive().optional());
const optionalDate = z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.date().optional());
const landingImageTypes: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

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
    heroVideoUrl: optionalHttpUrl,
    benefitsText: z.string().trim().max(3000).optional(),
    audienceText: z.string().trim().max(1500).optional(),
    ctaText: z.string().trim().min(2).max(60),
    accentColor: colorSchema,
    template: z.enum(["EDITORIAL", "CREATOR", "STUDIO"]),
    instructorName: z.string().trim().max(100).optional(),
    instructorRole: z.string().trim().max(120).optional(),
    instructorBio: z.string().trim().max(1500).optional(),
    instructorImageUrl: optionalHttpUrl,
    bonusesText: z.string().trim().max(3000).optional(),
    testimonialsText: z.string().trim().max(5000).optional(),
    faqText: z.string().trim().max(5000).optional(),
    guaranteeTitle: z.string().trim().max(120).optional(),
    guaranteeText: z.string().trim().max(1500).optional(),
    compareAtPrice: optionalInteger,
    promoEndsAt: optionalDate,
    facebookPixelId: z.string().trim().regex(/^\d{5,40}$/).or(z.literal("")),
    tiktokPixelId: z.string().trim().regex(/^[A-Za-z0-9]{5,40}$/).or(z.literal("")),
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
    heroVideoUrl: parsed.data.heroVideoUrl || null,
    benefitsText: parsed.data.benefitsText || null,
    audienceText: parsed.data.audienceText || null,
    ctaText: parsed.data.ctaText,
    accentColor: parsed.data.accentColor.toLowerCase(),
    template: parsed.data.template,
    instructorName: parsed.data.instructorName || null,
    instructorRole: parsed.data.instructorRole || null,
    instructorBio: parsed.data.instructorBio || null,
    instructorImageUrl: parsed.data.instructorImageUrl || null,
    bonusesText: parsed.data.bonusesText || null,
    testimonialsText: parsed.data.testimonialsText || null,
    faqText: parsed.data.faqText || null,
    guaranteeTitle: parsed.data.guaranteeTitle || null,
    guaranteeText: parsed.data.guaranteeText || null,
    compareAtPrice: parsed.data.compareAtPrice ?? null,
    promoEndsAt: parsed.data.promoEndsAt ?? null,
    facebookPixelId: parsed.data.facebookPixelId || null,
    tiktokPixelId: parsed.data.tiktokPixelId || null,
  }).onConflictDoUpdate({
    target: productLandingPages.productId,
    set: {
      eyebrow: parsed.data.eyebrow || null,
      heroTitle: parsed.data.heroTitle || null,
      heroSubtitle: parsed.data.heroSubtitle || null,
      coverImageUrl: parsed.data.coverImageUrl || null,
      heroVideoUrl: parsed.data.heroVideoUrl || null,
      benefitsText: parsed.data.benefitsText || null,
      audienceText: parsed.data.audienceText || null,
      ctaText: parsed.data.ctaText,
      accentColor: parsed.data.accentColor.toLowerCase(),
      template: parsed.data.template,
      instructorName: parsed.data.instructorName || null,
      instructorRole: parsed.data.instructorRole || null,
      instructorBio: parsed.data.instructorBio || null,
      instructorImageUrl: parsed.data.instructorImageUrl || null,
      bonusesText: parsed.data.bonusesText || null,
      testimonialsText: parsed.data.testimonialsText || null,
      faqText: parsed.data.faqText || null,
      guaranteeTitle: parsed.data.guaranteeTitle || null,
      guaranteeText: parsed.data.guaranteeText || null,
      compareAtPrice: parsed.data.compareAtPrice ?? null,
      promoEndsAt: parsed.data.promoEndsAt ?? null,
      facebookPixelId: parsed.data.facebookPixelId || null,
      tiktokPixelId: parsed.data.tiktokPixelId || null,
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/products/${ownedProduct.id}/landing`);
  revalidatePath(`/p/${ownedProduct.slug}`);
  redirect(`/dashboard/products/${ownedProduct.id}/landing?success=Landing+page+berhasil+disimpan`);
}

export async function uploadLandingMediaAction(productId: string, slot: "cover" | "instructor", formData: FormData) {
  const merchant = await requireMerchant();
  const file = formData.get("file");
  if (!(file instanceof File) || !landingImageTypes[file.type] || file.size < 1 || file.size > 5 * 1024 * 1024) {
    redirect(`/dashboard/products/${productId}/landing?error=Gunakan+gambar+JPG,+PNG,+atau+WebP+maksimal+5MB`);
  }
  const [ownedProduct] = await db.select({ id: products.id, slug: products.slug, landing: productLandingPages })
    .from(products).leftJoin(productLandingPages, eq(productLandingPages.productId, products.id))
    .where(and(eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!ownedProduct) redirect("/dashboard");

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (!verifyUploadSignature(fileBuffer, file.type)) redirect(`/dashboard/products/${productId}/landing?error=Isi+file+gambar+tidak+valid`);
  const storageKey = `${productId}-${slot}-${randomUUID()}${landingImageTypes[file.type]}`;
  await mkdir(landingMediaDirectory, { recursive: true });
  await writeFile(landingMediaPath(storageKey), fileBuffer, { flag: "wx" });
  const publicUrl = `/api/landing-media/${storageKey}`;
  const field = slot === "cover" ? { coverImageUrl: publicUrl } : { instructorImageUrl: publicUrl };
  await db.insert(productLandingPages).values({ productId, ...field }).onConflictDoUpdate({
    target: productLandingPages.productId,
    set: { ...field, updatedAt: new Date() },
  });

  const previousUrl = slot === "cover" ? ownedProduct.landing?.coverImageUrl : ownedProduct.landing?.instructorImageUrl;
  if (previousUrl?.startsWith("/api/landing-media/")) {
    await unlink(landingMediaPath(path.basename(previousUrl))).catch(() => undefined);
  }
  revalidatePath(`/dashboard/products/${productId}/landing`);
  revalidatePath(`/p/${ownedProduct.slug}`);
  redirect(`/dashboard/products/${productId}/landing?success=Gambar+berhasil+diunggah`);
}
