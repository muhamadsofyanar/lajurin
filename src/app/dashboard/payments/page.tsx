import { and, desc, eq } from "drizzle-orm";
import { reviewMerchantManualPaymentAction } from "@/app/actions/payment";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { formatRupiah } from "@/lib/format";
import { formatDate } from "@/lib/order";
import { orders, products } from "@/lib/schema";

export default async function MerchantPaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const merchant = await requireMerchant();
  await requireFeature("DIRECT_MANUAL_PAYMENTS", merchant.id);
  const { error, success } = await searchParams;
  const rows = await db.select({ order: orders, productName: products.name }).from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(and(
      eq(products.merchantId, merchant.id),
      eq(orders.status, "AWAITING_CONFIRMATION"),
      eq(orders.paymentMethod, "MANUAL_TRANSFER"),
      eq(orders.settlementMode, "MERCHANT_DIRECT"),
    )).orderBy(desc(orders.manualSubmittedAt));

  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Transfer langsung</span><h1 className="display" style={{marginTop:12}}>Konfirmasi pembayaran</h1><p>Hanya bukti pembayaran untuk produk dan rekening merchant Anda yang tampil di sini.</p></div></div>
    {error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}
    <div className="stack">{rows.length ? rows.map(({ order, productName }) => <article className="panel payment-review" key={order.id}><div><span className="badge">Transfer ke rekening merchant</span><h2>{productName}</h2><p>{order.customerName} · {order.customerEmail}</p><dl className="detail-list"><div><dt>Nominal</dt><dd>{formatRupiah(order.amount)}</dd></div><div><dt>Bank pengirim</dt><dd>{order.manualBankName}</dd></div><div><dt>Nama rekening</dt><dd>{order.manualAccountName}</dd></div><div><dt>Dikirim</dt><dd>{formatDate(order.manualSubmittedAt)}</dd></div></dl><p className="note">Tujuan: {order.manualDestinationBank} · {order.manualDestinationAccount} · a.n. {order.manualDestinationHolder}</p>{order.manualTransferNote && <p className="note">Catatan pembeli: {order.manualTransferNote}</p>}</div><div className="payment-review-forms"><a className="btn" href={`/api/payment-proof/${order.id}`} target="_blank" rel="noreferrer">Lihat bukti</a><form action={reviewMerchantManualPaymentAction.bind(null, order.id, "approve")}><button className="btn btn-lime" type="submit">Setujui & buka akses</button></form><form className="review-reject-form" action={reviewMerchantManualPaymentAction.bind(null, order.id, "reject")}><input className="input" name="reason" required minLength={5} maxLength={500} placeholder="Alasan penolakan" /><button className="btn btn-danger" type="submit">Tolak bukti</button></form></div></article>) : <section className="panel empty"><h2>Semua sudah ditinjau</h2><p>Belum ada transfer langsung yang menunggu konfirmasi.</p></section>}</div>
  </div></main>;
}
