import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ExternalLink, LayoutTemplate } from "lucide-react";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { productLandingPages, products } from "@/lib/schema";

export default async function LandingPagesPage() {
  const merchant = await requireMerchant();
  await requireFeature("LANDING_PAGE_BUILDER", merchant.id);
  const rows = await db.select({ product: products, landing: productLandingPages }).from(products)
    .leftJoin(productLandingPages, eq(productLandingPages.productId, products.id))
    .where(eq(products.merchantId, merchant.id)).orderBy(desc(products.updatedAt));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Landing Page Builder</span><h1 className="display" style={{ marginTop: 12 }}>Halaman penjualan</h1><p>Pilih produk, susun konten, pratinjau, lalu terbitkan bersama produk.</p></div></div><section className="panel"><div className="panel-head"><h2>Semua halaman</h2><span className="badge">{rows.length}</span></div>{rows.length ? rows.map(({ product, landing }) => <div className="analytics-row" key={product.id}><div><strong>{product.name}</strong><small>/p/{product.slug}</small></div><span><small>TEMPLATE</small><strong>{landing?.template ?? "EDITORIAL"}</strong></span><span><small>STATUS</small><strong>{product.status === "PUBLISHED" ? "Published" : "Draft"}</strong></span><span><small>KONTEN</small><strong>{landing ? "Tersimpan" : "Belum diatur"}</strong></span><div className="actions"><Link className="btn" href={`/dashboard/products/${product.id}/landing`}><LayoutTemplate size={15} /> Edit</Link><Link className="icon-btn" href={`/p/${product.slug}`} target="_blank" title="Pratinjau"><ExternalLink size={15} /></Link></div></div>) : <div className="empty"><p>Belum ada produk. Buat produk terlebih dahulu.</p></div>}</section></div></main>;
}
