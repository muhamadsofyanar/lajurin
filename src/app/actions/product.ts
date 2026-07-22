"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
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

const optionalVideoUrl = z.union([
  z.literal(""),
  z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "URL video harus memakai HTTP atau HTTPS"),
]).optional();

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
      videoUrl: optionalVideoUrl,
      isPreview: z.preprocess((value) => value === "on", z.boolean()),
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
      isPreview: parsed.data.isPreview,
      position: course.lessonCount + 1,
  });
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function updateLessonAction(productId: string, lessonId: string, formData: FormData) {
  const merchant = await requireMerchant();
  const parsed = z.object({
    title: z.string().trim().min(3).max(150),
    content: z.string().trim().min(10).max(20000),
    videoUrl: optionalVideoUrl,
    isPreview: z.preprocess((value) => value === "on", z.boolean()),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/dashboard/products/${productId}?error=Materi+belum+valid`);

  const [ownedLesson] = await db.select({ id: lessons.id }).from(lessons)
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id))
    .where(and(eq(lessons.id, lessonId), eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!ownedLesson) redirect("/dashboard");

  await db.update(lessons).set({
    title: parsed.data.title,
    content: parsed.data.content,
    videoUrl: parsed.data.videoUrl || null,
    isPreview: parsed.data.isPreview,
    updatedAt: new Date(),
  }).where(eq(lessons.id, lessonId));
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function moveLessonAction(productId: string, lessonId: string, direction: "up" | "down") {
  const merchant = await requireMerchant();
  const [ownedCourse] = await db.select({ id: courses.id }).from(courses)
    .innerJoin(products, eq(courses.productId, products.id))
    .where(and(eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!ownedCourse) redirect("/dashboard");

  const orderedLessons = await db.select({ id: lessons.id, position: lessons.position }).from(lessons)
    .where(eq(lessons.courseId, ownedCourse.id)).orderBy(asc(lessons.position));
  const index = orderedLessons.findIndex((lesson) => lesson.id === lessonId);
  const target = orderedLessons[index + (direction === "up" ? -1 : 1)];
  const lesson = orderedLessons[index];
  if (!lesson || !target) return;

  await db.update(lessons).set({
    position: sql<number>`case when ${lessons.id} = ${lesson.id} then ${target.position} when ${lessons.id} = ${target.id} then ${lesson.position} else ${lessons.position} end`,
    updatedAt: new Date(),
  }).where(and(eq(lessons.courseId, ownedCourse.id), inArray(lessons.id, [lesson.id, target.id])));
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function deleteLessonAction(productId: string, lessonId: string) {
  const merchant = await requireMerchant();
  const [ownedLesson] = await db.select({ id: lessons.id, courseId: lessons.courseId }).from(lessons)
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id))
    .where(and(eq(lessons.id, lessonId), eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!ownedLesson) redirect("/dashboard");

  await db.transaction(async (tx) => {
    await tx.delete(lessons).where(eq(lessons.id, lessonId));
    const remaining = await tx.select({ id: lessons.id }).from(lessons)
      .where(eq(lessons.courseId, ownedLesson.courseId)).orderBy(asc(lessons.position));
    for (const [index, lesson] of remaining.entries()) {
      await tx.update(lessons).set({ position: index + 1, updatedAt: new Date() }).where(eq(lessons.id, lesson.id));
    }
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
