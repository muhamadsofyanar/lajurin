import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate, orderStatusLabel } from "@/lib/order";
import { orders, products, users } from "@/lib/schema";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [[{ merchantCount }], [{ productCount }], [{ waitingCount }], paidRows, recentOrders] = await Promise.all([
    db.select({ merchantCount: count() }).from(users).where(eq(users.role, "MERCHANT")),
    db.select({ productCount: count() }).from(products),
    db.select({ waitingCount: count() }).from(orders).where(eq(orders.status, "AWAITING_CONFIRMATION")),
    db.select({ amount: orders.amount }).from(orders).where(eq(orders.status, "PAID")),
    db.select({ order: orders, productName: products.name }).from(orders).innerJoin(products, eq(orders.productId, products.id)).orderBy(desc(orders.createdAt)).limit(8),
  ]);
  const revenue = paidRows.reduce((sum, row) => sum + row.amount, 0);
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Administrator platform</span><h1 className="display" style={{marginTop:12}}>Halo, {admin.name.split(" ")[0]}.</h1><p>Pantau seluruh merchant, produk, dan transaksi Lajurin.</p></div><Link className="btn btn-primary" href="/admin/payments">Tinjau pembayaran ({waitingCount})</Link></div><section className="stats stats-4"><div className="stat"><span>Total merchant</span><strong>{merchantCount}</strong></div><div className="stat"><span>Total produk semua merchant</span><strong>{productCount}</strong></div><div className="stat"><span>Perlu dikonfirmasi admin</span><strong>{waitingCount}</strong></div><div className="stat"><span>Transaksi lunas platform</span><strong>{formatRupiah(revenue)}</strong></div></section><section className="panel"><div className="panel-head"><h2>Transaksi seluruh merchant</h2><span className="muted">8 terakhir</span></div>{recentOrders.map(({ order, productName }) => <div className="table-row" key={order.id}><div><strong>{productName}</strong><small>{order.customerName} · {order.customerEmail}</small></div><div><strong>{formatRupiah(order.amount)}</strong><small>{formatDate(order.createdAt)}</small></div><span className={`badge status-${order.status.toLowerCase()}`}>{orderStatusLabel[order.status]}</span></div>)}</section></div></main>;
}
