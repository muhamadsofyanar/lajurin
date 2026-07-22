import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { reportPeriodStart, safeCsvCell, type ReportPeriod } from "@/lib/reporting";
import { orders, products } from "@/lib/schema";

export async function GET(request: Request) {
  const merchant = await requireMerchant();
  await requireFeature("SALES_REPORTS", merchant.id);
  const raw = new URL(request.url).searchParams.get("period");
  const period: ReportPeriod = raw === "7" || raw === "90" || raw === "all" ? raw : "30";
  const start = reportPeriodStart(period);
  const merchantProducts = await db.select({ id: products.id, name: products.name }).from(products).where(eq(products.merchantId, merchant.id));
  const ids = merchantProducts.map((product) => product.id);
  const rows = ids.length ? await db.select({ order: orders, productName: products.name }).from(orders).innerJoin(products, eq(products.id, orders.productId)).where(and(inArray(orders.productId, ids), ...(start ? [gte(orders.createdAt, start)] : []))).orderBy(desc(orders.createdAt)) : [];
  const header = ["ID", "Tanggal", "Produk", "Pelanggan", "Email", "Status", "Metode", "Settlement", "Bruto", "Komisi", "Net"].map(safeCsvCell).join(",");
  const lines = rows.map(({ order, productName }) => [order.externalId, order.createdAt.toISOString(), productName, order.customerName, order.customerEmail, order.status, order.paymentMethod, order.settlementMode, order.amount, order.platformFeeAmount ?? 0, order.merchantNetAmount ?? order.amount].map(safeCsvCell).join(","));
  return new Response(`\uFEFF${[header, ...lines].join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lajurin-sales-${period}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
}
