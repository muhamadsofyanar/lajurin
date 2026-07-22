import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate, orderStatusLabel } from "@/lib/order";
import { merchantPayouts, orders, products, users } from "@/lib/schema";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [[{ merchantCount }], [{ memberCount }], [{ productCount }], [{ waitingCount }], [{ payoutCount }], paidRows, recentOrders] = await Promise.all([
    db.select({ merchantCount: count() }).from(users).where(eq(users.role, "MERCHANT")),
    db.select({ memberCount: count() }).from(users).where(eq(users.role, "MEMBER")),
    db.select({ productCount: count() }).from(products),
    db.select({ waitingCount: count() }).from(orders).where(eq(orders.status, "AWAITING_CONFIRMATION")),
    db.select({ payoutCount: count() }).from(merchantPayouts).where(eq(merchantPayouts.status, "REQUESTED")),
    db.select({ amount: orders.amount, fee: orders.platformFeeAmount, net: orders.merchantNetAmount }).from(orders).where(eq(orders.status, "PAID")),
    db.select({ order: orders, productName: products.name }).from(orders).innerJoin(products, eq(orders.productId, products.id)).orderBy(desc(orders.createdAt)).limit(8),
  ]);
  const gross = paidRows.reduce((sum, row) => sum + row.amount, 0);
  const platformFees = paidRows.reduce((sum, row) => sum + (row.fee ?? 0), 0);
  const merchantNet = paidRows.reduce((sum, row) => sum + (row.net ?? row.amount), 0);
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Administrator platform</span><h1 className="display" style={{marginTop:12}}>Halo, {admin.name.split(" ")[0]}.</h1><p>Pusat kendali merchant, transaksi, komisi, payout, produk, dan member.</p></div><div className="actions"><Link className="btn" href="/admin/payouts">Payout ({payoutCount})</Link><Link className="btn btn-primary" href="/admin/payments">Pembayaran ({waitingCount})</Link></div></div>
    <section className="stats stats-4"><Link className="stat stat-link" href="/admin/merchants"><span>Merchant</span><strong>{merchantCount}</strong></Link><Link className="stat stat-link" href="/admin/members"><span>Member</span><strong>{memberCount}</strong></Link><Link className="stat stat-link" href="/admin/products"><span>Produk</span><strong>{productCount}</strong></Link><Link className="stat stat-link" href="/admin/transactions"><span>Penjualan kotor</span><strong>{formatRupiah(gross)}</strong></Link></section>
    <section className="stats stats-3"><div className="stat"><span>Komisi platform tercatat</span><strong>{formatRupiah(platformFees)}</strong></div><div className="stat"><span>Hak bersih merchant</span><strong>{formatRupiah(merchantNet)}</strong></div><div className="stat"><span>Perlu tindakan</span><strong>{waitingCount + payoutCount}</strong></div></section>
    <section className="admin-shortcuts"><Link className="feature-card compact-card" href="/admin/operations"><strong>Kesiapan operasional</strong><p>Readiness, storage, dan webhook.</p></Link><Link className="feature-card compact-card" href="/admin/integrations"><strong>Integrasi notifikasi</strong><p>Status StarSender dan Mailketing.</p></Link><Link className="feature-card compact-card" href="/admin/audit"><strong>Audit log</strong><p>Jejak tindakan sensitif platform.</p></Link></section>
    <section className="panel"><div className="panel-head"><h2>Transaksi seluruh merchant</h2><Link className="muted" href="/admin/transactions">Lihat semua</Link></div>{recentOrders.map(({ order, productName }) => <div className="table-row" key={order.id}><div><strong>{productName}</strong><small>{order.customerName} · {order.customerEmail}</small></div><div><strong>{formatRupiah(order.amount)}</strong><small>{formatDate(order.createdAt)}</small></div><span className={`badge status-${order.status.toLowerCase()}`}>{orderStatusLabel[order.status]}</span></div>)}</section>
  </div></main>;
}
