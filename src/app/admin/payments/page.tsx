import { desc, eq } from "drizzle-orm";
import { reviewManualPaymentAction } from "@/app/actions/payment";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate } from "@/lib/order";
import { merchantProfiles, orders, products } from "@/lib/schema";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { error, success } = await searchParams;
  const rows = await db.select({ order: orders, productName: products.name, brandName: merchantProfiles.brandName }).from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .where(eq(orders.status, "AWAITING_CONFIRMATION")).orderBy(desc(orders.manualSubmittedAt));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">Konfirmasi pembayaran</h1><p>Transfer platform ditinjau admin. Transfer langsung hanya diambil alih ketika merchant berhalangan.</p></div></div>{error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}<div className="stack">{rows.length ? rows.map(({ order, productName, brandName }) => {
    const direct = order.settlementMode === "MERCHANT_DIRECT";
    return <article className="panel payment-review" key={order.id}><div><span className="badge">{direct ? "Transfer langsung · override admin" : "Transfer rekening platform"}</span><h2>{productName}</h2><p>{brandName} · {order.customerName} · {order.customerEmail}</p><dl className="detail-list"><div><dt>Nominal</dt><dd>{formatRupiah(order.amount)}</dd></div><div><dt>Bank pengirim</dt><dd>{order.manualBankName}</dd></div><div><dt>Nama rekening</dt><dd>{order.manualAccountName}</dd></div><div><dt>Dikirim</dt><dd>{formatDate(order.manualSubmittedAt)}</dd></div></dl>{direct && <p className="note">Tujuan: {order.manualDestinationBank} · {order.manualDestinationAccount} · a.n. {order.manualDestinationHolder}</p>}{order.manualTransferNote && <p className="note">Catatan pembeli: {order.manualTransferNote}</p>}</div><div className="payment-review-forms"><a className="btn" href={`/api/payment-proof/${order.id}`} target="_blank" rel="noreferrer">Lihat bukti</a><form className="review-decision-form" action={reviewManualPaymentAction.bind(null, order.id, "approve")}>{direct && <input className="input" name="reason" required minLength={10} maxLength={500} placeholder="Alasan override admin" />}<button className="btn btn-lime" type="submit">Setujui & buka akses</button></form><form className="review-decision-form" action={reviewManualPaymentAction.bind(null, order.id, "reject")}><input className="input" name="reason" required minLength={direct ? 10 : 5} maxLength={500} placeholder={direct ? "Alasan override dan penolakan" : "Alasan penolakan"} /><button className="btn btn-danger" type="submit">Tolak bukti</button></form></div></article>;
  }) : <section className="panel empty"><h2>Semua sudah ditinjau</h2><p>Belum ada pembayaran manual yang menunggu konfirmasi.</p></section>}</div></div></main>;
}
