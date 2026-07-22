import Link from "next/link";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { BarChart3, ExternalLink, MousePointerClick, ShoppingCart, TrendingUp } from "lucide-react";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { analyticsEvents, orders, products } from "@/lib/schema";

export default async function AnalyticsPage() {
  const merchant = await requireMerchant();
  const merchantProducts = await db.select().from(products).where(eq(products.merchantId, merchant.id)).orderBy(desc(products.createdAt));
  const ids = merchantProducts.map((product) => product.id);
  const eventRows = ids.length ? await db.select({ productId: analyticsEvents.productId, event: analyticsEvents.event, total: count() }).from(analyticsEvents).where(inArray(analyticsEvents.productId, ids)).groupBy(analyticsEvents.productId, analyticsEvents.event) : [];
  const paidRows = ids.length ? await db.select({ productId: orders.productId, total: count(), revenue: sql<number>`coalesce(sum(${orders.amount}), 0)::integer` }).from(orders).where(and(inArray(orders.productId, ids), eq(orders.status, "PAID"))).groupBy(orders.productId) : [];
  const utmRows = ids.length ? await db.select({ source: orders.utmSource, campaign: orders.utmCampaign, total: count(), revenue: sql<number>`coalesce(sum(${orders.amount}), 0)::integer` }).from(orders).where(and(inArray(orders.productId, ids), eq(orders.status, "PAID"))).groupBy(orders.utmSource, orders.utmCampaign).orderBy(desc(count())).limit(20) : [];
  const metric = (productId: string, event: "PAGE_VIEW" | "CHECKOUT_STARTED" | "PURCHASE") => Number(eventRows.find((row) => row.productId === productId && row.event === event)?.total ?? 0);
  const totals = merchantProducts.reduce((acc, product) => { acc.views += metric(product.id, "PAGE_VIEW"); acc.checkouts += metric(product.id, "CHECKOUT_STARTED"); acc.purchases += Number(paidRows.find((row) => row.productId === product.id)?.total ?? 0); acc.revenue += Number(paidRows.find((row) => row.productId === product.id)?.revenue ?? 0); return acc; }, { views: 0, checkouts: 0, purchases: 0, revenue: 0 });
  const conversion = totals.views ? (totals.purchases / totals.views) * 100 : 0;

  return <main className="app-main"><div className="shell analytics-shell"><div className="page-head"><div><span className="eyebrow">Analitik penjualan</span><h1 className="display" style={{ marginTop: 12 }}>Konversi & atribusi</h1><p>Page view dihitung maksimal sekali per sesi pengunjung dalam 30 menit; pembelian hanya dihitung saat status lunas.</p></div><Link className="btn" href="/dashboard">Kembali ke dashboard</Link></div>
    <section className="stats stats-4"><div className="stat"><MousePointerClick size={20} /><span>Page view</span><strong>{totals.views}</strong></div><div className="stat"><ShoppingCart size={20} /><span>Checkout dimulai</span><strong>{totals.checkouts}</strong></div><div className="stat"><TrendingUp size={20} /><span>Pembelian</span><strong>{totals.purchases}</strong><small>Konversi {conversion.toFixed(2)}%</small></div><div className="stat stat-highlight"><BarChart3 size={20} /><span>Omzet teratribusi</span><strong>{formatRupiah(totals.revenue)}</strong></div></section>
    <section className="panel"><div className="panel-head"><h2>Performa per produk</h2></div>{merchantProducts.length ? merchantProducts.map((product) => { const views = metric(product.id, "PAGE_VIEW"); const checkouts = metric(product.id, "CHECKOUT_STARTED"); const paid = paidRows.find((row) => row.productId === product.id); const purchases = Number(paid?.total ?? 0); return <div className="analytics-row" key={product.id}><div><strong>{product.name}</strong><small>{product.status === "PUBLISHED" ? "Aktif" : "Draf"}</small></div><span><small>VIEW</small><strong>{views}</strong></span><span><small>CHECKOUT</small><strong>{checkouts}</strong></span><span><small>BELI</small><strong>{purchases}</strong></span><span><small>CVR</small><strong>{views ? `${((purchases / views) * 100).toFixed(2)}%` : "—"}</strong></span><Link className="icon-btn" href={`/p/${product.slug}`} target="_blank" title="Lihat landing page"><ExternalLink size={15} /></Link></div>; }) : <div className="empty"><p>Belum ada produk.</p></div>}</section>
    <section className="panel"><div className="panel-head"><h2>Kampanye menghasilkan pembelian</h2></div>{utmRows.length ? utmRows.map((row, index) => <div className="utm-row" key={`${row.source}-${row.campaign}-${index}`}><div><strong>{row.campaign || "Tanpa nama kampanye"}</strong><small>Source: {row.source || "direct"}</small></div><span>{row.total} pembelian</span><strong>{formatRupiah(Number(row.revenue))}</strong></div>) : <div className="empty"><p>Belum ada transaksi lunas dengan parameter UTM.</p></div>}</section>
  </div></main>;
}
