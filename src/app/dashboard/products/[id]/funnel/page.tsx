import Link from "next/link";
import { and, desc, eq, ne } from "drizzle-orm";
import { BadgePercent, ExternalLink, GitBranch, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { createCouponAction, deleteCouponAction, toggleCouponAction, updateFunnelAction } from "@/app/actions/funnel";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { coupons, productFunnels, products } from "@/lib/schema";

function dateLabel(value: Date | null) {
  return value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(value) : "Tanpa batas";
}

export default async function FunnelPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const merchant = await requireMerchant();
  const { id } = await params;
  const { error, success } = await searchParams;
  const [[product], productCoupons, [funnel], offers] = await Promise.all([
    db.select().from(products).where(and(eq(products.id, id), eq(products.merchantId, merchant.id))).limit(1),
    db.select().from(coupons).where(eq(coupons.productId, id)).orderBy(desc(coupons.createdAt)),
    db.select().from(productFunnels).where(eq(productFunnels.productId, id)).limit(1),
    db.select().from(products).where(and(eq(products.merchantId, merchant.id), ne(products.id, id))).orderBy(products.name),
  ]);
  if (!product) notFound();
  const options = <><option value="">Tidak digunakan</option>{offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.name} — {formatRupiah(offer.price)}</option>)}</>;

  return <main className="app-main"><div className="shell funnel-shell">
    <div className="page-head"><div><span className="eyebrow">Sales funnel</span><h1 className="display" style={{ marginTop: 12 }}>{product.name}</h1><p>Atur kupon, penawaran tambahan checkout, dan rekomendasi setelah pembelian.</p></div><div className="actions"><Link className="btn" href={`/dashboard/products/${product.id}`}>Kembali</Link><Link className="btn" href={`/dashboard/products/${product.id}/landing`}>Landing page</Link><Link className="btn btn-primary" href={`/p/${product.slug}`} target="_blank">Lihat publik <ExternalLink size={15} /></Link></div></div>
    {error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}
    <div className="funnel-layout"><section className="stack">
      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2><GitBranch size={19} /> Rangkaian penawaran</h2></div><form className="form" action={updateFunnelAction.bind(null, product.id)}>
        <label className="check-field"><input type="checkbox" name="isActive" defaultChecked={funnel?.isActive ?? true} /><span><strong>Aktifkan funnel produk ini</strong><small>Jika dimatikan, checkout hanya menampilkan produk utama.</small></span></label>
        <div className="field"><label htmlFor="orderBumpProductId">Order bump di checkout</label><select className="input" id="orderBumpProductId" name="orderBumpProductId" defaultValue={funnel?.orderBumpProductId ?? ""}>{options}</select><small className="field-hint">Pembeli dapat menambahkan produk ini dalam pesanan yang sama.</small></div>
        <div className="field"><label htmlFor="bumpHeadline">Judul order bump</label><input className="input" id="bumpHeadline" name="bumpHeadline" defaultValue={funnel?.bumpHeadline ?? "Lengkapi hasil belajar Anda"} maxLength={120} /></div>
        <div className="field"><label htmlFor="bumpDescription">Deskripsi order bump</label><textarea className="input" id="bumpDescription" name="bumpDescription" defaultValue={funnel?.bumpDescription ?? ""} maxLength={500} /></div>
        <div className="two-field"><div className="field"><label htmlFor="upsellProductId">Upsell setelah pembelian</label><select className="input" id="upsellProductId" name="upsellProductId" defaultValue={funnel?.upsellProductId ?? ""}>{options}</select></div><div className="field"><label htmlFor="downsellProductId">Alternatif/downsell</label><select className="input" id="downsellProductId" name="downsellProductId" defaultValue={funnel?.downsellProductId ?? ""}>{options}</select></div></div>
        <p className="field-hint">Upsell dan downsell ditampilkan sebagai rekomendasi terarah setelah transaksi. Pembayaran tetap menjadi pesanan baru agar audit keuangan aman.</p>
        <button className="btn btn-primary" type="submit">Simpan funnel</button>
      </form></section>

      <section className="panel"><div className="panel-head"><h2>Kupon produk</h2><span className="badge">{productCoupons.length}</span></div>{productCoupons.length ? productCoupons.map((coupon) => <div className="coupon-row" key={coupon.id}><div className="coupon-code"><BadgePercent size={18} /><span><strong>{coupon.code}</strong><small>{coupon.discountType === "PERCENT" ? `${coupon.discountValue}%` : formatRupiah(coupon.discountValue)} · {coupon.redemptionCount}{coupon.maxRedemptions ? `/${coupon.maxRedemptions}` : ""} dipakai</small></span></div><div><small>Mulai: {dateLabel(coupon.startsAt)}</small><small>Berakhir: {dateLabel(coupon.expiresAt)}</small></div><span className={`badge ${coupon.isActive ? "badge-live" : ""}`}>{coupon.isActive ? "Aktif" : "Nonaktif"}</span><div className="actions"><form action={toggleCouponAction.bind(null, product.id, coupon.id)}><button className="btn btn-compact" type="submit">{coupon.isActive ? "Nonaktifkan" : "Aktifkan"}</button></form><form action={deleteCouponAction.bind(null, product.id, coupon.id)}><button className="icon-btn danger" type="submit" title="Hapus kupon"><Trash2 size={15} /></button></form></div></div>) : <div className="empty"><p>Belum ada kupon untuk produk ini.</p></div>}</section>
    </section>

    <aside className="panel form-panel coupon-create"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Buat kupon</h2></div><form className="form" action={createCouponAction.bind(null, product.id)}>
      <div className="field"><label htmlFor="code">Kode kupon</label><input className="input" id="code" name="code" required minLength={3} maxLength={24} placeholder="PROMO20" /></div>
      <div className="two-field"><div className="field"><label htmlFor="discountType">Jenis diskon</label><select className="input" id="discountType" name="discountType" defaultValue="PERCENT"><option value="PERCENT">Persen</option><option value="FIXED">Nominal rupiah</option></select></div><div className="field"><label htmlFor="discountValue">Nilai</label><input className="input" id="discountValue" name="discountValue" type="number" min={1} required /></div></div>
      <div className="field"><label htmlFor="maxRedemptions">Maksimal penggunaan</label><input className="input" id="maxRedemptions" name="maxRedemptions" type="number" min={1} placeholder="Kosong = tidak dibatasi" /></div>
      <div className="field"><label htmlFor="startsAt">Mulai berlaku</label><input className="input" id="startsAt" name="startsAt" type="datetime-local" /></div>
      <div className="field"><label htmlFor="expiresAt">Berakhir</label><input className="input" id="expiresAt" name="expiresAt" type="datetime-local" /></div>
      <button className="btn btn-primary" type="submit">Buat kupon</button><p className="field-hint">Diskon persen maksimal 90%. Diskon nominal harus lebih kecil dari harga produk.</p>
    </form></aside></div>
  </div></main>;
}
