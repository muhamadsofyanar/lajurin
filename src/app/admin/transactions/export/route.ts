import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { merchantProfiles, orders, products } from "@/lib/schema";

const validStatuses = ["PENDING", "AWAITING_CONFIRMATION", "PAID", "REJECTED", "EXPIRED", "FAILED", "REFUNDED"] as const;
const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Forbidden", { status: 403 });
  const url = new URL(request.url);
  const status = validStatuses.find((item) => item === url.searchParams.get("status"));
  const merchantId = url.searchParams.get("merchant")?.trim() || undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;
  const conditions = [status ? eq(orders.status, status) : undefined, merchantId ? eq(products.merchantId, merchantId) : undefined, q ? or(ilike(orders.customerName, `%${q}%`), ilike(orders.customerEmail, `%${q}%`), ilike(orders.externalId, `%${q}%`), ilike(products.name, `%${q}%`)) : undefined];
  const rows = await db.select({ order: orders, productName: products.name, brandName: merchantProfiles.brandName })
    .from(orders).innerJoin(products, eq(orders.productId, products.id)).innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .where(and(...conditions)).orderBy(desc(orders.createdAt));
  const header = ["ID Pesanan", "Tanggal", "Merchant", "Produk", "Pembeli", "Email", "Telepon", "Metode", "Status", "Subtotal", "Kode Kupon", "Diskon", "Order Bump", "Total", "Komisi BPS", "Komisi", "Net Merchant", "UTM Source", "UTM Medium", "UTM Campaign", "Refund", "Referensi Refund", "Alasan Refund", "Tanggal Refund"];
  const lines = [header.map(csv).join(","), ...rows.map(({ order, productName, brandName }) => [order.externalId, order.createdAt.toISOString(), brandName, productName, order.customerName, order.customerEmail, order.customerPhone, order.paymentMethod, order.status, order.subtotalAmount ?? order.amount, order.couponCode, order.discountAmount, order.orderBumpAmount, order.amount, order.platformFeeBps, order.platformFeeAmount, order.merchantNetAmount, order.utmSource, order.utmMedium, order.utmCampaign, order.refundAmount, order.refundReference, order.refundReason, order.refundedAt?.toISOString()].map(csv).join(","))];
  return new Response(`\uFEFF${lines.join("\r\n")}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="lajurin-transactions-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
