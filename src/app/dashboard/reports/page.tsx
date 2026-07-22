import Link from "next/link";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { formatRupiah } from "@/lib/format";
import { reportPeriodStart, type ReportPeriod } from "@/lib/reporting";
import { orders, products } from "@/lib/schema";

const periods: { value: ReportPeriod; label: string }[] = [{ value: "7", label: "7 hari" }, { value: "30", label: "30 hari" }, { value: "90", label: "90 hari" }, { value: "all", label: "Semua" }];

export default async function SalesReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const merchant = await requireMerchant();
  await requireFeature("SALES_REPORTS", merchant.id);
  const raw = (await searchParams).period;
  const period: ReportPeriod = raw === "7" || raw === "90" || raw === "all" ? raw : "30";
  const start = reportPeriodStart(period);
  const merchantProducts = await db.select({ id: products.id, name: products.name }).from(products).where(eq(products.merchantId, merchant.id));
  const ids = merchantProducts.map((product) => product.id);
  const condition = ids.length ? and(inArray(orders.productId, ids), ...(start ? [gte(orders.createdAt, start)] : [])) : undefined;
  const rows = condition ? await db.select().from(orders).where(condition).orderBy(desc(orders.createdAt)) : [];
  const paid = rows.filter((order) => order.status === "PAID");
  const gross = paid.reduce((sum, order) => sum + order.amount, 0);
  const fees = paid.reduce((sum, order) => sum + (order.platformFeeAmount ?? 0), 0);
  const net = paid.reduce((sum, order) => sum + (order.merchantNetAmount ?? order.amount), 0);
  const manual = paid.filter((order) => order.paymentMethod === "MANUAL_TRANSFER").length;
  const conversionBase = rows.filter((order) => !["FAILED", "EXPIRED"].includes(order.status)).length;
  const topProducts = merchantProducts.map((product) => { const productOrders = paid.filter((order) => order.productId === product.id); return { ...product, count: productOrders.length, revenue: productOrders.reduce((sum, order) => sum + order.amount, 0) }; }).sort((a, b) => b.revenue - a.revenue);
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Laporan penjualan</span><h1 className="display" style={{ marginTop: 12 }}>Kinerja usaha</h1><p>Ringkasan berdasarkan transaksi pada periode terpilih.</p></div><div className="actions">{periods.map((item) => <Link className={`btn ${period === item.value ? "btn-primary" : ""}`} href={`/dashboard/reports?period=${item.value}`} key={item.value}>{item.label}</Link>)}<Link className="btn btn-lime" href={`/dashboard/reports/export?period=${period}`}>Unduh CSV</Link></div></div><section className="stats stats-4"><div className="stat stat-highlight"><span>Omzet lunas</span><strong>{formatRupiah(gross)}</strong></div><div className="stat"><span>Pendapatan bersih</span><strong>{formatRupiah(net)}</strong></div><div className="stat"><span>Komisi platform</span><strong>{formatRupiah(fees)}</strong></div><div className="stat"><span>Transaksi lunas</span><strong>{paid.length}</strong><small>{conversionBase ? `${((paid.length / conversionBase) * 100).toFixed(1)}% dari checkout valid` : "Belum ada data"}</small></div></section><div className="two-col"><section className="panel"><div className="panel-head"><h2>Performa produk</h2></div>{topProducts.length ? topProducts.map((product) => <div className="finance-row" key={product.id}><div><strong>{product.name}</strong><small>{product.count} transaksi lunas</small></div><strong>{formatRupiah(product.revenue)}</strong></div>) : <div className="empty"><p>Belum ada produk.</p></div>}</section><section className="panel"><div className="panel-head"><h2>Metode pembayaran</h2></div><div className="stats"><div className="stat"><span>Transfer manual</span><strong>{manual}</strong></div><div className="stat"><span>Gateway</span><strong>{paid.length - manual}</strong></div><div className="stat"><span>Transfer langsung</span><strong>{paid.filter((order) => order.settlementMode === "MERCHANT_DIRECT").length}</strong></div></div></section></div><section className="panel"><div className="panel-head"><h2>Status transaksi</h2></div><div className="stats stats-4">{["PAID", "PENDING", "AWAITING_CONFIRMATION", "REJECTED", "REFUNDED", "FAILED", "EXPIRED"].map((status) => <div className="stat" key={status}><span>{status.replaceAll("_", " ")}</span><strong>{rows.filter((order) => order.status === status).length}</strong></div>)}</div></section></div></main>;
}
