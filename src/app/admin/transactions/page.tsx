import { and, desc, eq, ilike, or } from "drizzle-orm";
import { recordFullRefundAction } from "@/app/actions/payment";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate, orderStatusLabel } from "@/lib/order";
import { merchantProfiles, orders, products } from "@/lib/schema";

const validStatuses = ["PENDING", "AWAITING_CONFIRMATION", "PAID", "REJECTED", "EXPIRED", "FAILED", "REFUNDED"] as const;

export default async function AdminTransactionsPage({ searchParams }: { searchParams: Promise<{ status?: string; merchant?: string; q?: string; error?: string; success?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const status = validStatuses.find((item) => item === params.status);
  const merchantId = params.merchant?.trim() || undefined;
  const q = params.q?.trim() || undefined;
  const conditions = [status ? eq(orders.status, status) : undefined, merchantId ? eq(products.merchantId, merchantId) : undefined, q ? or(ilike(orders.customerName, `%${q}%`), ilike(orders.customerEmail, `%${q}%`), ilike(orders.externalId, `%${q}%`), ilike(products.name, `%${q}%`)) : undefined];
  const [rows, merchants] = await Promise.all([
    db.select({ order: orders, productName: products.name, merchantId: products.merchantId, brandName: merchantProfiles.brandName })
      .from(orders).innerJoin(products, eq(orders.productId, products.id)).innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
      .where(and(...conditions)).orderBy(desc(orders.createdAt)).limit(200),
    db.select({ id: merchantProfiles.userId, name: merchantProfiles.brandName }).from(merchantProfiles).orderBy(merchantProfiles.brandName),
  ]);
  const exportParams = new URLSearchParams();
  if (status) exportParams.set("status", status); if (merchantId) exportParams.set("merchant", merchantId); if (q) exportParams.set("q", q);

  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">Seluruh transaksi</h1><p>Filter lintas merchant, periksa snapshot keuangan, dan catat refund yang sudah benar-benar dikirim.</p></div><a className="btn" href={`/admin/transactions/export?${exportParams}`}>Unduh CSV</a></div>
    {params.error && <p className="alert">{params.error}</p>}{params.success && <p className="alert alert-success">{params.success}</p>}
    <form className="panel filter-bar" method="get"><input className="input" name="q" defaultValue={q} placeholder="Cari pembeli, email, produk, atau ID" /><select className="input" name="merchant" defaultValue={merchantId ?? ""}><option value="">Semua merchant</option>{merchants.map((merchant) => <option value={merchant.id} key={merchant.id}>{merchant.name}</option>)}</select><select className="input" name="status" defaultValue={status ?? ""}><option value="">Semua status</option>{validStatuses.map((item) => <option value={item} key={item}>{orderStatusLabel[item]}</option>)}</select><button className="btn btn-primary" type="submit">Terapkan</button></form>
    <section className="panel"><div className="panel-head"><h2>Hasil transaksi</h2><span className="muted">{rows.length} baris, maksimal 200</span></div>{rows.length ? rows.map(({ order, productName, brandName }) => <div className="transaction-card" key={order.id}><div className="transaction-row"><div><strong>{productName}{order.orderBumpProductId ? " + bump" : ""}</strong><small>{brandName} · {order.externalId}{order.couponCode ? ` · ${order.couponCode}` : ""}</small></div><div><strong>{order.customerName}</strong><small>{order.customerEmail} · {formatDate(order.createdAt)}</small></div><div><strong>{formatRupiah(order.amount)}</strong><small>{order.discountAmount ? `Diskon ${formatRupiah(order.discountAmount)} · ` : ""}Fee {formatRupiah(order.platformFeeAmount ?? 0)} · Net {formatRupiah(order.merchantNetAmount ?? order.amount)}</small></div><span className={`badge status-${order.status.toLowerCase()}`}>{orderStatusLabel[order.status]}</span></div>
      {order.status === "PAID" && <details className="refund-box"><summary>Catat refund penuh</summary><p>Transfer refund melalui bank/Xendit terlebih dahulu. Tindakan ini mencabut akses kelas dan membalik pendapatan bersih merchant.</p><form className="refund-form" action={recordFullRefundAction.bind(null, order.id)}><input className="input" name="reference" minLength={3} maxLength={120} placeholder="Referensi refund/transfer" required /><input className="input" name="reason" minLength={10} maxLength={500} placeholder="Alasan refund" required /><button className="btn" type="submit">Konfirmasi sudah direfund</button></form></details>}
      {order.status === "REFUNDED" && <div className="refund-record"><strong>Refund {formatRupiah(order.refundAmount ?? order.amount)}</strong><small>{order.refundReference} · {formatDate(order.refundedAt)} · {order.refundReason}</small></div>}
    </div>) : <div className="empty"><p>Tidak ada transaksi yang cocok.</p></div>}</section>
  </div></main>;
}
