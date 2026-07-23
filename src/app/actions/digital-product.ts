"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { productFiles, products } from "@/lib/schema";
import { digitalProductDirectory, digitalProductPath } from "@/lib/storage";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const allowedExtensions = new Set([".pdf", ".zip", ".epub", ".mp3", ".mp4", ".webm"]);
const mimeTypes: Record<string, string> = {
  ".pdf": "application/pdf", ".zip": "application/zip", ".epub": "application/epub+zip",
  ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".webm": "video/webm",
};

async function ownedDigitalProduct(productId: string, merchantId: string) {
  const [product] = await db.select().from(products)
    .where(and(eq(products.id, productId), eq(products.merchantId, merchantId), eq(products.type, "DIGITAL"))).limit(1);
  return product;
}

export async function uploadDigitalProductFileAction(productId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const product = await ownedDigitalProduct(productId, merchant.id);
  const file = formData.get("file");
  if (!product || !(file instanceof File) || file.size < 1 || file.size > MAX_FILE_SIZE) {
    redirect(`/dashboard/digital-products/${productId}?error=File+tidak+valid+atau+lebih+dari+50+MB`);
  }
  const extension = path.extname(file.name).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    redirect(`/dashboard/digital-products/${productId}?error=Gunakan+PDF,+ZIP,+EPUB,+MP3,+MP4,+atau+WEBM`);
  }
  const storageKey = `${randomUUID()}${extension}`;
  await mkdir(digitalProductDirectory, { recursive: true });
  await writeFile(digitalProductPath(storageKey), Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  try {
    await db.insert(productFiles).values({
      productId,
      fileName: path.basename(file.name).slice(0, 180) || `produk${extension}`,
      storageKey,
      mimeType: mimeTypes[extension] ?? "application/octet-stream",
      size: file.size,
    });
  } catch (error) {
    await unlink(digitalProductPath(storageKey)).catch(() => undefined);
    throw error;
  }
  revalidatePath(`/dashboard/digital-products/${productId}`);
}

export async function deleteDigitalProductFileAction(fileId: string) {
  const merchant = await requireMerchant("manage");
  const [row] = await db.select({ file: productFiles, product: products }).from(productFiles)
    .innerJoin(products, eq(productFiles.productId, products.id))
    .where(and(eq(productFiles.id, fileId), eq(products.merchantId, merchant.id), eq(products.type, "DIGITAL"))).limit(1);
  if (!row) redirect("/dashboard/products?error=File+tidak+ditemukan");
  await db.delete(productFiles).where(eq(productFiles.id, fileId));
  await unlink(digitalProductPath(row.file.storageKey)).catch(() => undefined);
  revalidatePath(`/dashboard/digital-products/${row.product.id}`);
}
