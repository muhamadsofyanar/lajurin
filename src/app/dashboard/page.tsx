import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  Eye,
  Package,
  Plus,
  ReceiptText,
  Settings2,
  Store,
  WalletCards,
} from "lucide-react";
import { and, count, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMerchantBalance } from "@/lib/finance";
import { formatRupiah } from "@/lib/format";
import { merchantPayouts, merchantProfiles, orders, products } from "@/lib/schema";
import { productEditHref, productTypeLabel } from "@/lib/catalog";

export default async function DashboardPage() {
  const merchant = await requireMerchant();
  if (merchant.role !== "MERCHANT") redirect("/admin");

  const [[profile], productRows, paidOrders, balance, [{ pendingPayouts }]] = await Promise.all([
    db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, merchant.id)).limit(1),
    db.select().from(products).where(eq(products.merchantId, merchant.id)).orderBy(desc(products.createdAt)),
    db.select({ amount: orders.amount, fee: orders.platformFeeAmount, net: orders.merchantNetAmount }).from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(and(eq(products.merchantId, merchant.id), eq(orders.status, "PAID"))),
    getMerchantBalance(merchant.id),
    db.select({ pendingPayouts: count() }).from(merchantPayouts)
      .where(and(eq(merchantPayouts.merchantId, merchant.id), eq(merchantPayouts.status, "REQUESTED"))),
  ]);

  const productData = await Promise.all(productRows.map(async (product) => {
    const [{ value: orderCount }] = await db.select({ value: count() }).from(orders).where(eq(orders.productId, product.id));
    return { ...product, orderCount };
  }));

  const gross = paidOrders.reduce((total, order) => total + order.amount, 0);
  const fees = paidOrders.reduce((total, order) => total + (order.fee ?? 0), 0);
  const net = paidOrders.reduce((total, order) => total + (order.net ?? order.amount), 0);
  const publishedCount = productData.filter((product) => product.status === "PUBLISHED").length;
  const draftCount = productData.filter((product) => product.status === "DRAFT").length;
  const archivedCount = productData.filter((product) => product.status === "ARCHIVED").length;
  const statusText = profile?.status === "ACTIVE" ? "Aktif" : profile?.status === "SUSPENDED" ? "Ditangguhkan" : "Menunggu aktivasi";
  const statusClass = profile?.status === "ACTIVE" ? "status-active" : profile?.status === "SUSPENDED" ? "status-suspended" : "status-pending";
  const storeUrl = profile?.status === "ACTIVE" && profile.slug ? `/m/${profile.slug}` : null;
  const canManage = ["OWNER", "ADMIN", "STAFF"].includes(merchant.membershipRole);
  const canFinance = ["OWNER", "FINANCE"].includes(merchant.membershipRole);
  const workspaceRole = merchant.membershipRole === "OWNER" ? "Owner" : merchant.membershipRole === "ADMIN" ? "Admin tim" : merchant.membershipRole === "FINANCE" ? "Finance" : "Staff";

  return (
    <main className="app-main dashboard-main">
      <div className="shell dashboard-shell">
        <section className="dashboard-hero" aria-labelledby="dashboard-title">
          <div className="dashboard-hero-copy">
            <div className="dashboard-kicker">
              <span className="eyebrow">Dashboard usaha{profile ? ` · ${profile.brandName}` : ""}</span>
              <span className={`badge ${statusClass}`}>{statusText}</span>
              <span className="badge">{workspaceRole}</span>
            </div>
            <h1 className="display" id="dashboard-title">Halo, {merchant.actorName.split(" ")[0]}.</h1>
            <p>Pantau performa penjualan dan kelola produk Anda dari satu ringkasan.</p>
          </div>
          <div className="dashboard-hero-actions">
            {storeUrl && <Link className="btn" href={storeUrl}><Eye size={17} /> Lihat toko</Link>}
            <Link className="btn" href="/dashboard/analytics"><BarChart3 size={17} /> Analitik</Link>
            {canManage && <Link className="btn btn-primary" href="/dashboard/products/new"><Plus size={17} /> Produk baru</Link>}
          </div>
        </section>

        {profile?.status !== "ACTIVE" && (
          <div className="alert store-alert dashboard-alert" role="status">
            <Store size={19} aria-hidden="true" />
            <div><strong>Status merchant: {statusText}.</strong><span>Anda tetap dapat menyiapkan produk. Toko publik dan checkout akan aktif setelah disetujui admin.</span></div>
            <Link href="/dashboard/profile">Periksa profil <ArrowRight size={15} /></Link>
          </div>
        )}

        <section className="stats stats-4 dashboard-stats" aria-label="Ringkasan keuangan">
          <article className="stat dashboard-stat">
            <span className="dashboard-stat-icon"><CircleDollarSign size={18} /></span>
            <div><span>Penjualan kotor</span><strong>{formatRupiah(gross)}</strong><small>Total transaksi yang sudah dibayar</small></div>
          </article>
          <article className="stat dashboard-stat">
            <span className="dashboard-stat-icon"><ReceiptText size={18} /></span>
            <div><span>Komisi platform</span><strong>{formatRupiah(fees)}</strong><small>Akumulasi biaya dari penjualan</small></div>
          </article>
          <article className="stat dashboard-stat">
            <span className="dashboard-stat-icon"><BarChart3 size={18} /></span>
            <div><span>Pendapatan bersih</span><strong>{formatRupiah(net)}</strong><small>Hak merchant setelah komisi</small></div>
          </article>
          {canFinance ? <Link className="stat stat-link stat-highlight dashboard-stat" href="/dashboard/finance">
            <span className="dashboard-stat-icon"><WalletCards size={18} /></span>
            <div><span>Saldo tersedia</span><strong>{formatRupiah(balance)}</strong><small>{pendingPayouts ? `${pendingPayouts} payout sedang diproses` : "Siap dicairkan sesuai minimum"}</small></div>
            <ArrowRight className="dashboard-stat-arrow" size={17} aria-hidden="true" />
          </Link> : <article className="stat stat-highlight dashboard-stat"><span className="dashboard-stat-icon"><WalletCards size={18} /></span><div><span>Saldo usaha</span><strong>{formatRupiah(balance)}</strong><small>Dikelola Owner atau Finance</small></div></article>}
        </section>

        <div className="dashboard-content-grid">
          <section className="panel dashboard-products" aria-labelledby="products-heading">
            <div className="panel-head dashboard-panel-head">
              <div><span className="eyebrow">Katalog</span><h2 id="products-heading">Produk milik {profile?.brandName ?? merchant.name}</h2></div>
              <span className="dashboard-count">{productData.length} produk</span>
            </div>
            {productData.length ? productData.map((product) => (
              <Link className="product-row dashboard-product-row" href={productEditHref(product)} key={product.id}>
                <span className="dashboard-product-icon"><Package size={19} /></span>
                <div className="dashboard-product-copy"><h3>{product.name}</h3><p>{productTypeLabel[product.type]} · /p/{product.slug} · {product.orderCount} pesanan</p></div>
                <strong className="price-cell">{formatRupiah(product.price)}</strong>
                <span className={`badge ${product.status === "PUBLISHED" ? "badge-live" : ""}`}>{product.status === "PUBLISHED" ? "Aktif" : product.status === "ARCHIVED" ? "Arsip" : "Draf"}</span>
                <ArrowRight className="dashboard-product-arrow" size={17} aria-hidden="true" />
              </Link>
            )) : (
              <div className="empty dashboard-empty">
                <span><Package size={25} /></span>
                <h3>Mulai dengan produk pertama</h3>
                <p>Buat produk digital, lengkapi materi, lalu terbitkan saat sudah siap.</p>
                <Link className="btn btn-primary" href="/dashboard/products/new"><Plus size={17} /> Buat produk</Link>
              </div>
            )}
          </section>

          <aside className="dashboard-side" aria-label="Informasi dan pintasan usaha">
            <section className="panel dashboard-store-card">
              <div className="dashboard-store-icon"><Store size={21} /></div>
              <span className="eyebrow">Kondisi katalog</span>
              <h2>{publishedCount} produk aktif</h2>
              <p>{draftCount ? `${draftCount} produk masih draf dan dapat Anda lanjutkan.` : archivedCount ? `${archivedCount} produk berada di arsip.` : publishedCount ? "Semua produk dalam katalog sudah terbit." : "Katalog masih kosong dan siap diisi."}</p>
              <div className="dashboard-store-summary"><span><strong>{productData.length}</strong><small>Total produk</small></span><span><strong>{publishedCount}</strong><small>Aktif</small></span><span><strong>{draftCount}</strong><small>Draf</small></span></div>
              {storeUrl ? <Link className="btn dashboard-side-button" href={storeUrl}>Buka toko publik <ArrowRight size={16} /></Link> : <Link className="btn dashboard-side-button" href="/dashboard/profile">Lengkapi profil toko <ArrowRight size={16} /></Link>}
            </section>

            <section className="panel dashboard-shortcuts">
              <div className="panel-head"><h2>Aksi cepat</h2></div>
              <nav aria-label="Aksi cepat dashboard">
                {canFinance && <Link href="/dashboard/finance"><WalletCards size={18} /><span><strong>Saldo & payout</strong><small>Kelola pencairan dana</small></span><ArrowRight size={16} /></Link>}
                {canManage && <Link href="/dashboard/profile"><Settings2 size={18} /><span><strong>Profil toko</strong><small>Atur identitas dan kontak</small></span><ArrowRight size={16} /></Link>}
                <Link href="/dashboard/orders"><ReceiptText size={18} /><span><strong>Transaksi</strong><small>Lihat status pesanan</small></span><ArrowRight size={16} /></Link>
              </nav>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
