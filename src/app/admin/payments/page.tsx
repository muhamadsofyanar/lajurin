import { desc, eq } from "drizzle-orm";
import { reviewManualPaymentAction } from "@/app/actions/payment";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate } from "@/lib/order";
import { orders, products } from "@/lib/schema";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const rows = await db.select({ order: orders, productName: products.name }).from(orders).innerJoin(products, eq(orders.productId, products.id)).where(eq(orders.status, "AWAITING_CONFIRMATION")).orderBy(desc(orders.manualSubmittedAt));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">Konfirmasi pembayaran</h1><p>Periksa nominal dan bukti transfer sebelum membuka akses kursus.</p></div></div>{error && <p className="alert">{error}</p>}<div className="stack">{rows.length ? rows.map(({ order, productName }) => <article className="panel payment-review" key={order.id}><div><span className="badge">Transfer manual</span><h2>{productName}</h2><p>{order.customerName} · {order.customerEmail}</p><dl className="detail-list"><div><dt>Nominal</dt><dd>{formatRupiah(order.amount)}</dd></div><div><dt>Bank pengirim</dt><dd>{order.manualBankName}</dd></div><div><dt>Nama rekening</dt><dd>{order.manualAccountName}</dd></div><div><dt>Dikirim</dt><dd>{formatDate(order.manualSubmittedAt)}</dd></div></dl>{order.manualTransferNote && <p className="note">Catatan: {order.manualTransferNote}</p>}</div><div className="review-actions"><a className="btn" href={`/api/payment-proof/${order.id}`} target="_blank" rel="noreferrer">Lihat bukti</a><form action={reviewManualPaymentAction.bind(null, order.id, "reject")}><button className="btn btn-danger" type="submit">Tolak</button></form><form action={reviewManualPaymentAction.bind(null, order.id, "approve")}><button className="btn btn-lime" type="submit">Setujui & buka akses</button></form></div></article>) : <section className="panel empty"><h2>Semua sudah ditinjau</h2><p>Belum ada pembayaran manual yang menunggu konfirmasi.</p></section>}</div></div></main>;
}
