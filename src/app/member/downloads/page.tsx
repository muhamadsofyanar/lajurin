import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, productFiles, products } from "@/lib/schema";
import { formatFileSize } from "@/lib/services";

export default async function MemberDownloadsPage() {
  const user = await requireUser();
  const rows = await db.select({ product: products, file: productFiles }).from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(productFiles, eq(productFiles.productId, products.id))
    .where(and(eq(orders.customerId, user.id), eq(orders.status, "PAID"), eq(products.type, "DIGITAL")))
    .orderBy(asc(products.name), asc(productFiles.createdAt));
  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><h1 className="display">Unduhan saya</h1><p>Produk digital yang sudah lunas tersedia secara privat di sini.</p></div></div>
    <section className="panel"><div className="panel-head"><h2>File tersedia</h2><span className="badge">{rows.length}</span></div>
      {rows.length ? rows.map(({ product, file }) => <div className="attachment-row" key={file.id}><span><strong>{product.name}</strong><small>{file.fileName} · {formatFileSize(file.size)}</small></span><Link className="btn btn-compact" href={`/api/digital-product/${file.id}`}>Unduh</Link></div>) : <div className="empty"><p>Belum ada produk digital yang dapat diunduh.</p></div>}
    </section>
  </div></main>;
}
