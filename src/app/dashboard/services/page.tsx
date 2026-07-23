import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { orders, products, serviceCases } from "@/lib/schema";
import { serviceStatusLabel } from "@/lib/services";

export default async function ServicesPage() {
  const merchant = await requireMerchant("read");
  const rows = await db.select({ serviceCase: serviceCases, order: orders, productName: products.name })
    .from(serviceCases).innerJoin(orders, eq(serviceCases.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .where(eq(serviceCases.merchantId, merchant.id)).orderBy(desc(serviceCases.updatedAt));

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><h1 className="display">Layanan</h1><p>Kelola data, dokumen, penanggung jawab, dan progres pesanan jasa.</p></div><Link className="btn btn-primary" href="/dashboard/products/new">Buat layanan</Link></div>
    <section className="panel"><div className="panel-head"><h2>Pesanan jasa</h2><span className="muted">{rows.length} kasus</span></div>
      {rows.length ? rows.map(({ serviceCase, order, productName }) => <div className="table-row" key={serviceCase.id}>
        <div><strong>{productName}</strong><small>{order.customerName} · {order.customerEmail}</small></div>
        <div><strong>{serviceStatusLabel[serviceCase.status]}</strong><small>Diperbarui {formatDate(serviceCase.updatedAt)}</small></div>
        <Link className="btn btn-compact" href={`/dashboard/services/${serviceCase.id}`}>Buka kasus</Link>
      </div>) : <div className="empty"><p>Belum ada pesanan jasa. Terbitkan produk bertipe Jasa agar pelanggan dapat membelinya.</p></div>}
    </section>
  </div></main>;
}
