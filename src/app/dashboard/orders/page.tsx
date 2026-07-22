import { desc, eq } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate, orderStatusLabel } from "@/lib/order";
import { orders, products } from "@/lib/schema";

export default async function MerchantOrdersPage() {
  const merchant = await requireMerchant();
  const rows = await db.select({ order: orders, productName: products.name }).from(orders).innerJoin(products, eq(orders.productId, products.id)).where(eq(products.merchantId, merchant.id)).orderBy(desc(orders.createdAt));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">Transaksi</h1><p>Penjualan merchant ini beserta bruto, diskon, komisi platform, dan pendapatan bersih.</p></div></div><section className="panel"><div className="panel-head"><h2>Daftar transaksi</h2><span className="muted">{rows.length} transaksi</span></div>{rows.length ? rows.map(({ order, productName }) => <div className="transaction-row merchant-transaction-row" key={order.id}><div><strong>{productName}{order.orderBumpProductId ? " + order bump" : ""}</strong><small>{order.customerName} · {order.customerEmail}{order.couponCode ? ` · Kupon ${order.couponCode}` : ""}</small></div><div><strong>{formatRupiah(order.amount)}</strong><small>{order.discountAmount ? `Diskon ${formatRupiah(order.discountAmount)} · ` : ""}{formatDate(order.createdAt)} · {order.paymentMethod === "MANUAL_TRANSFER" ? "Transfer manual" : "Xendit"}</small></div><div><strong>{order.status === "PAID" ? formatRupiah(order.merchantNetAmount ?? order.amount) : "—"}</strong><small>{order.status === "PAID" ? `Komisi ${formatRupiah(order.platformFeeAmount ?? 0)}` : "Net setelah pembayaran lunas"}</small></div><span className={`badge status-${order.status.toLowerCase()}`}>{orderStatusLabel[order.status]}</span></div>) : <div className="empty"><p>Belum ada transaksi.</p></div>}</section></div></main>;
}
