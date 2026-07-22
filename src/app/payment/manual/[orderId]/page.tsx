import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { submitManualPaymentAction } from "@/app/actions/payment";
import { Brand } from "@/components/brand";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { orders, products } from "@/lib/schema";

export default async function ManualPaymentPage({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { orderId } = await params;
  const { error } = await searchParams;
  const [row] = await db.select({ order: orders, productName: products.name }).from(orders).innerJoin(products, eq(orders.productId, products.id)).where(and(eq(orders.id, orderId), eq(orders.customerId, user.id), eq(orders.paymentMethod, "MANUAL_TRANSFER"))).limit(1);
  if (!row) notFound();
  if (row.order.status === "PAID" || row.order.status === "AWAITING_CONFIRMATION") {
    return <main className="auth-main" style={{minHeight:"100vh"}}><section className="auth-card"><Brand /><h1 className="display" style={{marginTop:34}}>{row.order.status === "PAID" ? "Pembayaran sudah lunas" : "Bukti sedang ditinjau"}</h1><p>{row.order.status === "PAID" ? "Akses kursus Anda telah aktif." : "Admin akan memeriksa bukti transfer Anda sebelum akses dibuka."}</p><Link className="btn btn-primary" href="/member/orders">Lihat pesanan saya</Link></section></main>;
  }
  const destinationBank = process.env.MANUAL_BANK_NAME || "BCA";
  const destinationAccount = process.env.MANUAL_BANK_ACCOUNT || "1234567890";
  const destinationHolder = process.env.MANUAL_BANK_HOLDER || "PT Lajurin Indonesia";
  const action = submitManualPaymentAction.bind(null, row.order.id);
  return <main className="auth-wrap"><aside className="auth-aside"><Brand inverse /><div><span className="eyebrow">Transfer manual</span><h1 className="display" style={{marginTop:18}}>{row.productName}</h1><div className="price" style={{color:"var(--lime)"}}>{formatRupiah(row.order.amount)}</div><div className="bank-card"><small>Transfer tepat ke</small><strong>{destinationBank} · {destinationAccount}</strong><span>a.n. {destinationHolder}</span></div></div><small>Simpan bukti transfer untuk proses verifikasi.</small></aside><section className="auth-main"><div className="auth-card"><Link className="muted" href="/member/orders">← Pesanan saya</Link><h2 className="display" style={{marginTop:24}}>Konfirmasi pembayaran</h2><p>Unggah bukti setelah transfer. Admin akan meninjau secara manual.</p>{error && <p className="alert">{error}</p>}<form className="form" action={action}><div className="field"><label htmlFor="bankName">Bank pengirim</label><input className="input" id="bankName" name="bankName" required placeholder="Contoh: BRI" /></div><div className="field"><label htmlFor="accountName">Nama pemilik rekening</label><input className="input" id="accountName" name="accountName" required /></div><div className="field"><label htmlFor="proof">Bukti transfer</label><input className="input file-input" id="proof" name="proof" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" /><small className="muted">JPG, PNG, WebP, atau PDF. Maksimal 3 MB.</small></div><div className="field"><label htmlFor="note">Catatan (opsional)</label><textarea className="input" id="note" name="note" maxLength={500} /></div><button className="btn btn-primary" type="submit">Kirim bukti pembayaran</button></form></div></section></main>;
}
