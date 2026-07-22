import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, products } from "@/lib/schema";

const contentTypes: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };

export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { orderId } = await params;
  const [row] = await db.select({ order: orders, merchantId: products.merchantId }).from(orders).innerJoin(products, eq(orders.productId, products.id)).where(eq(orders.id, orderId)).limit(1);
  if (!row?.order.manualProofUrl) return new Response("Not found", { status: 404 });
  if (user.role !== "ADMIN" && row.order.customerId !== user.id && row.merchantId !== user.id) return new Response("Forbidden", { status: 403 });
  const fileName = path.basename(row.order.manualProofUrl);
  if (fileName !== row.order.manualProofUrl) return new Response("Invalid file", { status: 400 });
  const uploadDir = process.env.MANUAL_PAYMENT_DIR || "/tmp/lajurin-payment-proofs";
  try {
    const data = await readFile(path.join(/*turbopackIgnore: true*/ uploadDir, fileName));
    return new Response(data, { headers: { "Content-Type": contentTypes[path.extname(fileName).toLowerCase()] || "application/octet-stream", "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
