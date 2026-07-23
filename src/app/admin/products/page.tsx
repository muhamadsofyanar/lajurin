import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { toggleProductFeaturedAction, updateProductStatusAdminAction } from "@/app/actions/admin";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { merchantProfiles, products } from "@/lib/schema";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const rows = await db.select({ product: products, brandName: merchantProfiles.brandName }).from(products)
    .innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId)).orderBy(desc(products.createdAt));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">Produk platform</h1><p>Moderasi seluruh produk tanpa mengambil alih editor milik merchant.</p></div></div>{error && <p className="alert">{error}</p>}<section className="panel"><div className="panel-head"><h2>Semua produk</h2><span className="muted">{rows.length} produk</span></div>{rows.map(({ product, brandName }) => <div className="admin-product-row" key={product.id}><div><strong>{product.name}</strong><small>{brandName} · /p/{product.slug} · {formatRupiah(product.price)}</small></div><div><span className={`badge ${product.status === "PUBLISHED" ? "badge-live" : ""}`}>{product.status}</span>{product.isFeatured && <span className="badge">Unggulan</span>}</div><div className="actions"><Link className="btn btn-compact" href={`/p/${product.slug}`} target="_blank">Lihat</Link><form action={toggleProductFeaturedAction.bind(null, product.id, !product.isFeatured)}><button className="btn btn-compact" type="submit">{product.isFeatured ? "Hapus unggulan" : "Jadikan unggulan"}</button></form>{product.status !== "DRAFT" && <form action={updateProductStatusAdminAction.bind(null, product.id, "DRAFT")}><button className="btn btn-compact" type="submit">Jadikan draf</button></form>}{product.status !== "ARCHIVED" && <form action={updateProductStatusAdminAction.bind(null, product.id, "ARCHIVED")}><button className="btn btn-danger btn-compact" type="submit">Arsipkan</button></form>}</div></div>)}</section></div></main>;
}
