import Link from "next/link";
import { Plus } from "lucide-react";
import { and, count, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMerchantBalance } from "@/lib/finance";
import { formatRupiah } from "@/lib/format";
import { merchantPayouts, merchantProfiles, orders, products } from "@/lib/schema";

export default async function DashboardPage() {
  const merchant = await requireMerchant();
  if (merchant.role !== "MERCHANT") redirect("/admin");
  const [[profile], productRows, paidOrders, balance, [{ pendingPayouts }]] = await Promise.all([
    db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, merchant.id)).limit(1),
    db.select().from(products).where(eq(products.merchantId, merchant.id)).orderBy(desc(products.createdAt)),
    db.select({ amount: orders.amount, fee: orders.platformFeeAmount, net: orders.merchantNetAmount }).from(orders)
      .innerJoin(products, eq(orders.productId, products.id)).where(and(eq(products.merchantId, merchant.id), eq(orders.status, "PAID"))),
    getMerchantBalance(merchant.id),
    db.select({ pendingPayouts: count() }).from(merchantPayouts).where(and(eq(merchantPayouts.merchantId, merchant.id), eq(merchantPayouts.status, "REQUESTED"))),
  ]);
  const productData = await Promise.all(productRows.map(async (product) => {
    const [{ value: orderCount }] = await db.select({ value: count() }).from(orders).where(eq(orders.productId, product.id));
    return { ...product, orderCount };
  }));
  const gross = paidOrders.reduce((total, order) => total + order.amount, 0);
  const fees = paidOrders.reduce((total, order) => total + (order.fee ?? 0), 0);
  const net = paidOrders.reduce((total, order) => total + (order.net ?? order.amount), 0);
  const statusText = profile?.status === "ACTIVE" ? "Aktif" : profile?.status === "SUSPENDED" ? "Ditangguhkan" : "Menunggu aktivasi";

  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Dashboard usaha{profile ? ` · ${profile.brandName}` : ""}</span><h1 className="display" style={{ marginTop: 12 }}>Halo, {merchant.name.split(" ")[0]}.</h1><p>Data di halaman ini hanya berasal dari produk milik merchant yang sedang login.</p></div><div className="actions"><Link className="btn" href="/dashboard/analytics">Analitik</Link><Link className="btn" href="/dashboard/finance">Saldo & payout</Link><Link className="btn" href="/dashboard/profile">Profil toko</Link><Link className="btn btn-primary" href="/dashboard/products/new"><Plus size={17} /> Produk baru</Link></div></div>
    {profile?.status !== "ACTIVE" && <p className="alert store-alert"><strong>Status merchant: {statusText}.</strong> Anda tetap dapat menyiapkan produk, tetapi toko publik dan checkout baru aktif setelah disetujui admin.</p>}
    <section className="stats stats-4"><div className="stat"><span>Penjualan kotor</span><strong>{formatRupiah(gross)}</strong></div><div className="stat"><span>Komisi platform</span><strong>{formatRupiah(fees)}</strong></div><div className="stat"><span>Pendapatan bersih</span><strong>{formatRupiah(net)}</strong></div><Link className="stat stat-link stat-highlight" href="/dashboard/finance"><span>Saldo tersedia</span><strong>{formatRupiah(balance)}</strong><small>{pendingPayouts ? `${pendingPayouts} payout diproses` : "Siap dicairkan sesuai minimum"}</small></Link></section>
    <section className="panel"><div className="panel-head"><h2>Produk milik {profile?.brandName ?? merchant.name}</h2><span className="muted" style={{fontSize:12}}>{productData.length} produk</span></div>{productData.length ? productData.map((product) => <Link className="product-row" href={`/dashboard/products/${product.id}`} key={product.id}><div><h3>{product.name}</h3><p>/p/{product.slug} · {product.orderCount} pesanan</p></div><strong className="price-cell">{formatRupiah(product.price)}</strong><span className={`badge ${product.status === "PUBLISHED" ? "badge-live" : ""}`}>{product.status === "PUBLISHED" ? "Aktif" : product.status === "ARCHIVED" ? "Arsip" : "Draf"}</span></Link>) : <div className="empty"><p>Belum ada produk.</p><Link className="btn btn-primary" href="/dashboard/products/new">Buat produk pertama</Link></div>}</section>
  </div></main>;
}
