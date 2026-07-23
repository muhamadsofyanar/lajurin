import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate, orderStatusLabel } from "@/lib/order";
import { orders, products, serviceCases } from "@/lib/schema";

export default async function MemberOrdersPage({ searchParams }: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { success, error } = await searchParams;
  const rows = await db.select({
    order: orders,
    productName: products.name,
    productType: products.type,
    serviceCaseId: serviceCases.id,
  }).from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .leftJoin(serviceCases, eq(serviceCases.orderId, orders.id))
    .where(eq(orders.customerId, user.id)).orderBy(desc(orders.createdAt));

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><h1 className="display">Pesanan saya</h1><p>Pantau pembayaran, akses produk, dan progres layanan Anda.</p></div></div>
    {success && <p className="alert alert-success">{success}</p>}{error && <p className="alert">{error}</p>}
    <section className="panel"><div className="panel-head"><h2>Riwayat pesanan</h2><span className="muted">{rows.length} pesanan</span></div>
      {rows.length ? rows.map(({ order, productName, productType, serviceCaseId }) => <div className="table-row" key={order.id}>
        <div><strong>{productName}{order.orderBumpProductId ? " + produk tambahan" : ""}</strong><small>{order.externalId} · {formatDate(order.createdAt)}{order.couponCode ? ` · Kupon ${order.couponCode}` : ""}</small></div>
        <div><strong>{formatRupiah(order.amount)}</strong><small>{order.discountAmount ? `Hemat ${formatRupiah(order.discountAmount)} · ` : ""}{order.paymentMethod === "MANUAL_TRANSFER" ? "Transfer manual" : "Xendit"}</small></div>
        <div className="row-action"><span className={`badge status-${order.status.toLowerCase()}`}>{orderStatusLabel[order.status]}</span>
          {productType === "SERVICE" && serviceCaseId && <Link className="btn btn-compact" href={`/member/services/${serviceCaseId}`}>Portal layanan</Link>}
          {order.paymentMethod === "MANUAL_TRANSFER" && ["PENDING", "REJECTED"].includes(order.status) && <Link className="btn btn-compact" href={`/payment/manual/${order.id}`}>{order.status === "REJECTED" ? "Kirim ulang bukti" : "Bayar"}</Link>}
        </div>
      </div>) : <div className="empty"><p>Belum ada pesanan.</p></div>}
    </section>
  </div></main>;
}
