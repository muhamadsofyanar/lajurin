import { readFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { getCurrentUser, getMerchantAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, productFiles, products } from "@/lib/schema";
import { digitalProductPath } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Silakan masuk.", { status: 401 });
  const { fileId } = await params;
  const [row] = await db.select({ file: productFiles, product: products }).from(productFiles)
    .innerJoin(products, eq(productFiles.productId, products.id))
    .where(and(eq(productFiles.id, fileId), eq(products.type, "DIGITAL"))).limit(1);
  if (!row) return new Response("File tidak ditemukan.", { status: 404 });

  let allowed = user.role === "ADMIN";
  if (!allowed) {
    const merchant = await getMerchantAccess(user.id);
    allowed = merchant?.ownerId === row.product.merchantId;
  }
  if (!allowed) {
    const [purchase] = await db.select({ id: orders.id }).from(orders)
      .where(and(eq(orders.productId, row.product.id), eq(orders.customerId, user.id), eq(orders.status, "PAID"))).limit(1);
    allowed = Boolean(purchase);
  }
  if (!allowed) return new Response("Anda tidak memiliki akses ke file ini.", { status: 403 });
  try {
    const body = await readFile(digitalProductPath(row.file.storageKey));
    const safeName = row.file.fileName.replace(/["\r\n]/g, "_");
    return new Response(body, {
      headers: {
        "Content-Type": row.file.mimeType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("File tidak tersedia.", { status: 404 });
  }
}
