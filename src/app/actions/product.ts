"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { courses, lessons, products } from "@/lib/schema";

const productSchema = z.object({
  name: z.string().trim().min(3).max(120),
  headline: z.string().trim().min(10).max(180),
  description: z.string().trim().min(20).max(3000),
  price: z.coerce.number().int().min(10000).max(100000000),
});

async function uniqueSlug(name: string) {
  const base = slugify(name) || "produk";
  let slug = base;
  let suffix = 2;
  while ((await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1)).length) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

export async function createProductAction(formData: FormData) {
  const merchant = await requireMerchant();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/dashboard/products/new?error=Data+produk+belum+valid");

  const product = await db.transaction(async (tx) => {
    const [created] = await tx.insert(products).values({
      merchantId: merchant.id,
      ...parsed.data,
      slug: await uniqueSlug(parsed.data.name),
    }).returning();
    await tx.insert(courses).values({ productId: created.id, title: created.name, description: created.description });
    return created;
  });

  redirect(`/dashboard/products/${product.id}`);
}

export async function updateProductAction(productId: string, formData: FormData) {
  const merchant = await requireMerchant();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/dashboard/products/${productId}?error=Data+produk+belum+valid`);

  const [result] = await db.update(products).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(products.id, productId), eq(products.merchantId, merchant.id))).returning({ id: products.id });
  if (!result) redirect("/dashboard");
  await db.update(courses).set({ title: parsed.data.name, description: parsed.data.description, updatedAt: new Date() }).where(eq(courses.productId, productId));
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function addLessonAction(productId: string, formData: FormData) {
  const merchant = await requireMerchant();
  const parsed = z
    .object({
      title: z.string().trim().min(3).max(150),
      content: z.string().trim().min(10).max(20000),
      videoUrl: z.union([z.literal(""), z.string().url()]).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/dashboard/products/${productId}?error=Materi+belum+valid`);

  const [course] = await db.select({ id: courses.id, lessonCount: count(lessons.id) }).from(courses).innerJoin(products, eq(courses.productId, products.id)).leftJoin(lessons, eq(lessons.courseId, courses.id)).where(and(eq(courses.productId, productId), eq(products.merchantId, merchant.id))).groupBy(courses.id).limit(1);
  if (!course) redirect("/dashboard");

  await db.insert(lessons).values({
      courseId: course.id,
      title: parsed.data.title,
      content: parsed.data.content,
      videoUrl: parsed.data.videoUrl || null,
      position: course.lessonCount + 1,
  });
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function togglePublishAction(productId: string) {
  const merchant = await requireMerchant();
  const [product] = await db.select({ status: products.status, slug: products.slug, courseId: courses.id }).from(products).leftJoin(courses, eq(courses.productId, products.id)).where(and(eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!product) redirect("/dashboard");
  const hasLessons = product.courseId ? (await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, product.courseId)).limit(1)).length > 0 : false;
  if (product.status === "DRAFT" && !hasLessons) {
    redirect(`/dashboard/products/${productId}?error=Tambahkan+minimal+satu+materi`);
  }

  await db.update(products).set({ status: product.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED", updatedAt: new Date() }).where(eq(products.id, productId));
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath(`/p/${product.slug}`);
}
