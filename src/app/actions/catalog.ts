"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { courses, lessonAttachments, lessons, orders, productFiles, products, serviceProductFields } from "@/lib/schema";

async function uniqueSlug(name: string) {
  const base = slugify(name) || "produk";
  for (let suffix = 1; suffix < 1000; suffix++) {
    const slug = suffix === 1 ? base : `${base}-${suffix}`;
    const [found] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
    if (!found) return slug;
  }
  throw new Error("SLUG_EXHAUSTED");
}

export async function setProductArchivedAction(productId: string, archived: boolean) {
  const merchant = await requireMerchant("manage");
  await db.update(products).set({ status: archived ? "ARCHIVED" : "DRAFT", updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.merchantId, merchant.id)));
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard");
}

export async function duplicateProductAction(productId: string) {
  const merchant = await requireMerchant("manage");
  const [source] = await db.select().from(products)
    .where(and(eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!source) redirect("/dashboard/products?error=Produk+tidak+ditemukan");
  const copy = await db.transaction(async (tx) => {
    const copyName = `${source.name} (Salinan)`;
    const [created] = await tx.insert(products).values({
      merchantId: merchant.id, name: copyName, slug: await uniqueSlug(copyName),
      headline: source.headline, description: source.description, price: source.price,
      type: source.type, status: "DRAFT",
    }).returning();
    await tx.insert(courses).values({ productId: created.id, title: copyName, description: source.description });
    if (source.type === "SERVICE") {
      const fields = await tx.select().from(serviceProductFields).where(eq(serviceProductFields.productId, source.id));
      if (fields.length) await tx.insert(serviceProductFields).values(fields.map((field) => ({
        productId: created.id, fieldKey: field.fieldKey, label: field.label, type: field.type,
        required: field.required, position: field.position,
      })));
    }
    return created;
  });
  redirect(`/dashboard/products?success=${encodeURIComponent(`${copy.name} berhasil dibuat sebagai draf`)}`);
}

export async function deleteProductAction(productId: string) {
  const merchant = await requireMerchant("manage");
  const [product] = await db.select().from(products)
    .where(and(eq(products.id, productId), eq(products.merchantId, merchant.id))).limit(1);
  if (!product || product.status === "PUBLISHED") redirect("/dashboard/products?error=Arsipkan+produk+sebelum+menghapus");
  const [[orderTotal], [fileTotal], [attachmentTotal]] = await Promise.all([
    db.select({ value: count() }).from(orders).where(eq(orders.productId, productId)),
    db.select({ value: count() }).from(productFiles).where(eq(productFiles.productId, productId)),
    db.select({ value: count() }).from(lessonAttachments)
      .innerJoin(lessons, eq(lessonAttachments.lessonId, lessons.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(eq(courses.productId, productId)),
  ]);
  if (orderTotal.value > 0) redirect("/dashboard/products?error=Produk+yang+sudah+memiliki+pesanan+tidak+bisa+dihapus");
  if (fileTotal.value > 0 || attachmentTotal.value > 0) redirect("/dashboard/products?error=Hapus+semua+file+produk+lebih+dulu");
  await db.delete(products).where(and(eq(products.id, productId), eq(products.merchantId, merchant.id)));
  redirect("/dashboard/products?success=Produk+berhasil+dihapus");
}
