import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { deleteProductAction, duplicateProductAction, setProductArchivedAction } from "@/app/actions/catalog";
import { requireMerchant } from "@/lib/auth";
import { productEditHref, productTypeLabel } from "@/lib/catalog";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { orders, products } from "@/lib/schema";

export default async function ProductsPage({ searchParams }: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const merchant = await requireMerchant();
  const { success, error } = await searchParams;
  const rows = await db.select({ product: products, orderCount: count(orders.id) }).from(products)
    .leftJoin(orders, eq(orders.productId, products.id))
    .where(eq(products.merchantId, merchant.id)).groupBy(products.id).orderBy(desc(products.createdAt));
  const canManage = ["OWNER", "ADMIN", "STAFF"].includes(merchant.membershipRole);
  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><h1 className="display">Produk</h1><p>Kelola semua kursus, produk digital, dan jasa dalam satu katalog.</p></div>{canManage && <Link className="btn btn-primary" href="/dashboard/products/new">Produk baru</Link>}</div>
    {success && <p className="alert alert-success">{success}</p>}{error && <p className="alert">{error}</p>}
    <section className="panel"><div className="panel-head"><h2>Katalog usaha</h2><span className="badge">{rows.length}</span></div>
      {rows.length ? rows.map(({ product, orderCount }) => <div className="table-row" key={product.id}>
        <div><strong>{product.name}</strong><small>{productTypeLabel[product.type]} · /p/{product.slug} · {orderCount} pesanan</small></div>
        <div><strong>{formatRupiah(product.price)}</strong><small>{product.status === "PUBLISHED" ? "Aktif dijual" : product.status === "ARCHIVED" ? "Diarsipkan" : "Belum terbit"}</small></div>
        <div className="row-action"><Link className="btn btn-compact" href={productEditHref(product)}>Kelola</Link>{canManage && <>
          <form action={duplicateProductAction.bind(null, product.id)}><button className="btn btn-compact" type="submit">Duplikat</button></form>
          <form action={setProductArchivedAction.bind(null, product.id, product.status !== "ARCHIVED")}><button className="btn btn-compact" type="submit">{product.status === "ARCHIVED" ? "Pulihkan" : "Arsipkan"}</button></form>
          {product.status !== "PUBLISHED" && <form action={deleteProductAction.bind(null, product.id)}><button className="btn btn-compact btn-danger" type="submit">Hapus</button></form>}
        </>}</div>
      </div>) : <div className="empty"><p>Belum ada produk.</p><Link className="btn btn-primary" href="/dashboard/products/new">Buat produk pertama</Link></div>}
    </section>
  </div></main>;
}
