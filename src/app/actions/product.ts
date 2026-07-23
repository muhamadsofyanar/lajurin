"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { courseModules, courses, lessonAttachments, lessons, products } from "@/lib/schema";
import { courseFileDirectory, courseFilePath } from "@/lib/storage";
import { verifyUploadSignature } from "@/lib/security";

const MAX_COURSE_FILE_SIZE = 15 * 1024 * 1024;
const allowedCourseFileExtensions = new Set([".pdf", ".epub", ".zip", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"]);

const productSchema = z.object({
  type: z.enum(["COURSE", "SERVICE"]).default("COURSE"),
  name: z.string().trim().min(3).max(120),
  headline: z.string().trim().min(10).max(180),
  description: z.string().trim().min(20).max(3000),
  price: z.coerce.number().int().min(10000).max(100000000),
});

const optionalVideoUrl = z.union([
  z.literal(""),
  z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "URL video harus memakai HTTP atau HTTPS"),
]).optional();

const optionalModuleId = z.union([z.literal(""), z.string().uuid()]).optional();

async function getOwnedCourse(productId: string, merchantId: string) {
  const [course] = await db.select({ id: courses.id }).from(courses)
    .innerJoin(products, eq(courses.productId, products.id))
    .where(and(eq(products.id, productId), eq(products.merchantId, merchantId))).limit(1);
  return course;
}

async function resolveOwnedModule(moduleId: string | undefined, courseId: string) {
  if (!moduleId) return null;
  const [module] = await db.select({ id: courseModules.id }).from(courseModules)
    .where(and(eq(courseModules.id, moduleId), eq(courseModules.courseId, courseId))).limit(1);
  return module?.id ?? null;
}

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
  const merchant = await requireMerchant("manage");
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
  const merchant = await requireMerchant("manage");
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/dashboard/products/${productId}?error=Data+produk+belum+valid`);

  const [result] = await db.update(products).set({ ...parsed.data, updatedAt: new Date() }).where(and(eq(products.id, productId), eq(products.merchantId, merchant.id))).returning({ id: products.id });
  if (!result) redirect("/dashboard");
  await db.insert(courses).values({ productId, title: parsed.data.name, description: parsed.data.description })
    .onConflictDoUpdate({ target: courses.productId, set: { title: parsed.data.name, description: parsed.data.description, updatedAt: new Date() } });
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function addLessonAction(productId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z
    .object({
      title: z.string().trim().min(3).max(150),
      content: z.string().trim().min(10).max(20000),
      videoUrl: optionalVideoUrl,
      moduleId: optionalModuleId,
      isPreview: z.preprocess((value) => value === "on", z.boolean()),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/dashboard/products/${productId}?error=Materi+belum+valid`);

  const [course] = await db.select({ id: courses.id, lessonCount: count(lessons.id) }).from(courses).innerJoin(products, eq(courses.productId, products.id)).leftJoin(lessons, eq(lessons.courseId, courses.id)).where(and(eq(courses.productId, productId), eq(products.merchantId, merchant.id))).groupBy(courses.id).limit(1);
  if (!course) redirect("/dashboard");
  const moduleId = await resolveOwnedModule(parsed.data.moduleId, course.id);
  if (parsed.data.moduleId && !moduleId) redirect(`/dashboard/products/${productId}?error=Bab+tidak+ditemukan`);

  await db.insert(lessons).values({
      courseId: course.id,
      moduleId,
      title: parsed.data.title,
      content: parsed.data.content,
      videoUrl: parsed.data.videoUrl || null,
      isPreview: parsed.data.isPreview,
      position: course.lessonCount + 1,
  });
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function updateLessonAction(productId: string, lessonId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({
    title: z.string().trim().min(3).max(150),
    content: z.string().trim().min(10).max(20000),
    videoUrl: optionalVideoUrl,
    moduleId: optionalModuleId,
    isPreview: z.preprocess((value) => value === "on", z.boolean()),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/dashboard/products/${productId}?error=Materi+belum+valid`);

  const [ownedLesson] = await db.select({ id: lessons.id, courseId: lessons.courseId }).from(lessons)
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id))
    .where(and(eq(lessons.id, lessonId), eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!ownedLesson) redirect("/dashboard");
  const moduleId = await resolveOwnedModule(parsed.data.moduleId, ownedLesson.courseId);
  if (parsed.data.moduleId && !moduleId) redirect(`/dashboard/products/${productId}?error=Bab+tidak+ditemukan`);

  await db.update(lessons).set({
    title: parsed.data.title,
    content: parsed.data.content,
    videoUrl: parsed.data.videoUrl || null,
    moduleId,
    isPreview: parsed.data.isPreview,
    updatedAt: new Date(),
  }).where(eq(lessons.id, lessonId));
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function addCourseModuleAction(productId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(500).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/dashboard/products/${productId}?error=Data+bab+belum+valid`);

  const course = await getOwnedCourse(productId, merchant.id);
  if (!course) redirect("/dashboard");
  const [{ value }] = await db.select({ value: count() }).from(courseModules).where(eq(courseModules.courseId, course.id));
  await db.insert(courseModules).values({
    courseId: course.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    position: value + 1,
  });
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function updateCourseModuleAction(productId: string, moduleId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({
    title: z.string().trim().min(3).max(120),
    description: z.string().trim().max(500).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/dashboard/products/${productId}?error=Data+bab+belum+valid`);

  const course = await getOwnedCourse(productId, merchant.id);
  if (!course) redirect("/dashboard");
  await db.update(courseModules).set({
    title: parsed.data.title,
    description: parsed.data.description || null,
    updatedAt: new Date(),
  }).where(and(eq(courseModules.id, moduleId), eq(courseModules.courseId, course.id)));
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function moveCourseModuleAction(productId: string, moduleId: string, direction: "up" | "down") {
  const merchant = await requireMerchant("manage");
  const course = await getOwnedCourse(productId, merchant.id);
  if (!course) redirect("/dashboard");
  const orderedModules = await db.select({ id: courseModules.id, position: courseModules.position }).from(courseModules)
    .where(eq(courseModules.courseId, course.id)).orderBy(asc(courseModules.position));
  const index = orderedModules.findIndex((module) => module.id === moduleId);
  const currentModule = orderedModules[index];
  const target = orderedModules[index + (direction === "up" ? -1 : 1)];
  if (!currentModule || !target) return;
  await db.update(courseModules).set({
    position: sql<number>`case when ${courseModules.id} = ${currentModule.id} then ${target.position} when ${courseModules.id} = ${target.id} then ${currentModule.position} else ${courseModules.position} end`,
    updatedAt: new Date(),
  }).where(and(eq(courseModules.courseId, course.id), inArray(courseModules.id, [currentModule.id, target.id])));
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function deleteCourseModuleAction(productId: string, moduleId: string) {
  const merchant = await requireMerchant("manage");
  const course = await getOwnedCourse(productId, merchant.id);
  if (!course) redirect("/dashboard");
  const [ownedModule] = await db.select({ id: courseModules.id }).from(courseModules)
    .where(and(eq(courseModules.id, moduleId), eq(courseModules.courseId, course.id))).limit(1);
  if (!ownedModule) return;
  await db.transaction(async (tx) => {
    await tx.delete(courseModules).where(eq(courseModules.id, moduleId));
    const remaining = await tx.select({ id: courseModules.id }).from(courseModules)
      .where(eq(courseModules.courseId, course.id)).orderBy(asc(courseModules.position));
    for (const [index, module] of remaining.entries()) {
      await tx.update(courseModules).set({ position: index + 1, updatedAt: new Date() }).where(eq(courseModules.id, module.id));
    }
  });
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function uploadLessonAttachmentAction(productId: string, lessonId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) redirect(`/dashboard/products/${productId}?error=Pilih+file+materi`);
  const extension = path.extname(file.name).toLowerCase();
  if (!allowedCourseFileExtensions.has(extension)) redirect(`/dashboard/products/${productId}?error=Format+file+tidak+didukung`);
  if (file.size > MAX_COURSE_FILE_SIZE) redirect(`/dashboard/products/${productId}?error=Ukuran+file+maksimal+15+MB`);

  const [ownedLesson] = await db.select({ id: lessons.id }).from(lessons)
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id))
    .where(and(eq(lessons.id, lessonId), eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!ownedLesson) redirect("/dashboard");

  const originalName = path.basename(file.name).replace(/[\r\n"]/g, "_").slice(0, 180) || `materi${extension}`;
  const storageKey = `${randomUUID()}${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (!verifyUploadSignature(fileBuffer, file.type)) redirect(`/dashboard/products/${productId}?error=Isi+file+tidak+sesuai+dengan+format`);
  await mkdir(courseFileDirectory, { recursive: true });
  await writeFile(courseFilePath(storageKey), fileBuffer, { flag: "wx" });
  try {
    await db.insert(lessonAttachments).values({
      lessonId,
      fileName: originalName,
      storageKey,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });
  } catch (error) {
    await unlink(courseFilePath(storageKey)).catch(() => undefined);
    throw error;
  }
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function deleteLessonAttachmentAction(productId: string, attachmentId: string) {
  const merchant = await requireMerchant("manage");
  const [attachment] = await db.select({ id: lessonAttachments.id, storageKey: lessonAttachments.storageKey }).from(lessonAttachments)
    .innerJoin(lessons, eq(lessonAttachments.lessonId, lessons.id))
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id))
    .where(and(eq(lessonAttachments.id, attachmentId), eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!attachment) redirect("/dashboard");
  await db.delete(lessonAttachments).where(eq(lessonAttachments.id, attachment.id));
  await unlink(courseFilePath(path.basename(attachment.storageKey))).catch(() => undefined);
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function moveLessonAction(productId: string, lessonId: string, direction: "up" | "down") {
  const merchant = await requireMerchant("manage");
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
  const merchant = await requireMerchant("manage");
  const [ownedLesson] = await db.select({ id: lessons.id, courseId: lessons.courseId }).from(lessons)
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id))
    .where(and(eq(lessons.id, lessonId), eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!ownedLesson) redirect("/dashboard");
  const lessonFiles = await db.select({ storageKey: lessonAttachments.storageKey }).from(lessonAttachments)
    .where(eq(lessonAttachments.lessonId, lessonId));

  await db.transaction(async (tx) => {
    await tx.delete(lessons).where(eq(lessons.id, lessonId));
    const remaining = await tx.select({ id: lessons.id }).from(lessons)
      .where(eq(lessons.courseId, ownedLesson.courseId)).orderBy(asc(lessons.position));
    for (const [index, lesson] of remaining.entries()) {
      await tx.update(lessons).set({ position: index + 1, updatedAt: new Date() }).where(eq(lessons.id, lesson.id));
    }
  });
  await Promise.all(lessonFiles.map((file) => unlink(courseFilePath(path.basename(file.storageKey))).catch(() => undefined)));
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function togglePublishAction(productId: string) {
  const merchant = await requireMerchant("manage");
  const [product] = await db.select({ status: products.status, type: products.type, slug: products.slug, courseId: courses.id }).from(products).leftJoin(courses, eq(courses.productId, products.id)).where(and(eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!product) redirect("/dashboard");
  const hasLessons = product.courseId ? (await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, product.courseId)).limit(1)).length > 0 : false;
  if (product.type === "COURSE" && product.status === "DRAFT" && !hasLessons) {
    redirect(`/dashboard/products/${productId}?error=Tambahkan+minimal+satu+materi`);
  }

  await db.update(products).set({ status: product.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED", updatedAt: new Date() }).where(eq(products.id, productId));
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath(`/p/${product.slug}`);
}
