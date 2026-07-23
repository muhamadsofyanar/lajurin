import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { orders, products, serviceCases } from "@/lib/schema";
import { serviceStatusLabel } from "@/lib/services";

export default async function ServicesPage() {
  const merchant = await requireMerchant("read");
  const [rows, serviceProducts] = await Promise.all([
    db.select({ serviceCase: serviceCases, order: orders, productName: products.name })
      .from(serviceCases).innerJoin(orders, eq(serviceCases.orderId, orders.id))
      .innerJoin(products, eq(orders.productId, products.id))
      .where(eq(serviceCases.merchantId, merchant.id)).orderBy(desc(serviceCases.updatedAt)),
    db.select().from(products).where(eq(products.merchantId, merchant.id)).orderBy(desc(products.createdAt)),
  ]);
  const services = serviceProducts.filter((product) => product.type === "SERVICE");

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><h1 className="display">Layanan</h1><p>Kelola data, dokumen, penanggung jawab, dan progres pesanan jasa.</p></div><Link className="btn btn-primary" href="/dashboard/products/new">Buat layanan</Link></div>
    <section className="panel"><div className="panel-head"><h2>Produk jasa</h2><span className="muted">{services.length} layanan</span></div>
      {services.length ? services.map((product) => <div className="table-row" key={product.id}>
        <div><strong>{product.name}</strong><small>{product.status === "PUBLISHED" ? "Sudah terbit dan dapat dibeli" : product.status === "DRAFT" ? "Masih draf" : "Diarsipkan"}</small></div>
        <span className={`badge status-${product.status.toLowerCase()}`}>{product.status}</span>
        <Link className="btn btn-compact" href={`/dashboard/services/products/${product.id}`}>Kelola layanan</Link>
      </div>) : <div className="empty"><p>Belum ada produk jasa. Klik “Buat layanan” untuk membuatnya.</p></div>}
    </section>
    <section className="panel"><div className="panel-head"><h2>Pesanan jasa</h2><span className="muted">{rows.length} kasus</span></div>
      {rows.length ? rows.map(({ serviceCase, order, productName }) => <div className="table-row" key={serviceCase.id}>
        <div><strong>{productName}</strong><small>{order.customerName} · {order.customerEmail}</small></div>
        <div><strong>{serviceStatusLabel[serviceCase.status]}</strong><small>Diperbarui {formatDate(serviceCase.updatedAt)}</small></div>
        <Link className="btn btn-compact" href={`/dashboard/services/${serviceCase.id}`}>Buka kasus</Link>
      </div>) : <div className="empty"><p>Belum ada pelanggan yang membeli layanan. Kasus baru akan muncul otomatis setelah checkout.</p></div>}
    </section>
  </div></main>;
}
