import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { ExternalLink, ImageUp, LayoutTemplate, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { updateLandingPageAction, uploadLandingMediaAction } from "@/app/actions/merchant";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { productLandingPages, products } from "@/lib/schema";

function localDateTime(value: Date | null | undefined) {
  if (!value) return "";
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

export default async function LandingPageEditor({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const merchant = await requireMerchant();
  await requireFeature("LANDING_PAGE_BUILDER", merchant.id);
  const { id } = await params;
  const { error, success } = await searchParams;
  const [row] = await db.select({ product: products, landing: productLandingPages }).from(products)
    .leftJoin(productLandingPages, eq(productLandingPages.productId, products.id))
    .where(and(eq(products.id, id), eq(products.merchantId, merchant.id))).limit(1);
  if (!row) notFound();
  const { product, landing } = row;

  return <main className="app-main"><div className="shell builder-shell">
    <div className="page-head"><div><span className="eyebrow">Landing page lengkap</span><h1 className="display" style={{ marginTop: 12 }}>{product.name}</h1><p>Susun halaman penjualan, bukti kepercayaan, promo, dan tracking tanpa menulis kode.</p></div><div className="actions"><Link className="btn" href={`/dashboard/products/${product.id}`}>Kembali</Link><Link className="btn" href={`/dashboard/products/${product.id}/funnel`}>Kupon & funnel</Link><Link className="btn btn-primary" href={`/p/${product.slug}`} target="_blank">Pratinjau <ExternalLink size={15} /></Link></div></div>
    {error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}

    <div className="builder-layout"><section className="stack">
      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Media landing page</h2><ImageUp size={20} /></div>
        <div className="media-upload-grid"><form className="form media-upload-card" action={uploadLandingMediaAction.bind(null, product.id, "cover")}><strong>Gambar hero/cover</strong><p className="muted">Landscape 16:9, JPG/PNG/WebP maksimal 5 MB.</p><input className="input file-input" name="file" type="file" accept="image/jpeg,image/png,image/webp" required /><button className="btn" type="submit">Unggah cover</button></form><form className="form media-upload-card" action={uploadLandingMediaAction.bind(null, product.id, "instructor")}><strong>Foto pengajar</strong><p className="muted">Foto persegi atau portrait, maksimal 5 MB.</p><input className="input file-input" name="file" type="file" accept="image/jpeg,image/png,image/webp" required /><button className="btn" type="submit">Unggah foto</button></form></div>
      </section>

      <section className="panel form-panel"><form className="form builder-form" action={updateLandingPageAction.bind(null, product.id)}>
        <div className="builder-section-head"><span>01</span><div><h2>Tampilan dan hero</h2><p>Pilih karakter visual, judul, media, dan ajakan utama.</p></div></div>
        <div className="two-field"><div className="field"><label htmlFor="template">Template</label><select className="input" id="template" name="template" defaultValue={landing?.template ?? "EDITORIAL"}><option value="EDITORIAL">Editorial Trust — terang & profesional</option><option value="CREATOR">Creator Momentum — hangat & energik</option><option value="STUDIO">Creator Studio — gelap & premium</option></select></div><div className="field color-field"><label htmlFor="accentColor">Warna aksen</label><input id="accentColor" name="accentColor" type="color" defaultValue={landing?.accentColor ?? "#0f9f91"} /></div></div>
        <div className="field"><label htmlFor="eyebrow">Label audiens</label><input className="input" id="eyebrow" name="eyebrow" defaultValue={landing?.eyebrow ?? "Untuk kreator & UMKM"} maxLength={80} /></div>
        <div className="field"><label htmlFor="heroTitle">Judul utama</label><input className="input" id="heroTitle" name="heroTitle" defaultValue={landing?.heroTitle ?? product.headline} maxLength={180} /></div>
        <div className="field"><label htmlFor="heroSubtitle">Penjelasan utama</label><textarea className="input" id="heroSubtitle" name="heroSubtitle" defaultValue={landing?.heroSubtitle ?? product.description} maxLength={1000} /></div>
        <div className="two-field"><div className="field"><label htmlFor="coverImageUrl">URL cover alternatif</label><input className="input" id="coverImageUrl" name="coverImageUrl" type="text" defaultValue={landing?.coverImageUrl ?? ""} placeholder="https://... atau gunakan upload di atas" /></div><div className="field"><label htmlFor="heroVideoUrl">URL video penawaran</label><input className="input" id="heroVideoUrl" name="heroVideoUrl" type="url" defaultValue={landing?.heroVideoUrl ?? ""} placeholder="YouTube, Vimeo, Loom, atau MP4" /></div></div>
        <div className="field"><label htmlFor="benefitsText">Manfaat utama</label><textarea className="input" id="benefitsText" name="benefitsText" defaultValue={landing?.benefitsText ?? ""} maxLength={3000} placeholder={"Satu manfaat per baris\nMateri praktis dan terarah\nAkses belajar fleksibel"} /><small className="field-hint">Satu manfaat per baris.</small></div>
        <div className="field"><label htmlFor="audienceText">Cocok untuk siapa</label><textarea className="input" id="audienceText" name="audienceText" defaultValue={landing?.audienceText ?? ""} maxLength={1500} /></div>

        <div className="builder-section-head"><span>02</span><div><h2>Pengajar dan bukti</h2><p>Bangun kepercayaan dengan profil, bonus, testimoni, dan FAQ.</p></div></div>
        <div className="two-field"><div className="field"><label htmlFor="instructorName">Nama pengajar</label><input className="input" id="instructorName" name="instructorName" defaultValue={landing?.instructorName ?? ""} maxLength={100} /></div><div className="field"><label htmlFor="instructorRole">Keahlian/jabatan</label><input className="input" id="instructorRole" name="instructorRole" defaultValue={landing?.instructorRole ?? ""} maxLength={120} /></div></div>
        <div className="field"><label htmlFor="instructorBio">Bio pengajar</label><textarea className="input" id="instructorBio" name="instructorBio" defaultValue={landing?.instructorBio ?? ""} maxLength={1500} /></div>
        <div className="field"><label htmlFor="instructorImageUrl">URL foto pengajar alternatif</label><input className="input" id="instructorImageUrl" name="instructorImageUrl" type="text" defaultValue={landing?.instructorImageUrl ?? ""} placeholder="https://... atau gunakan upload di atas" /></div>
        <div className="field"><label htmlFor="bonusesText">Bonus</label><textarea className="input" id="bonusesText" name="bonusesText" defaultValue={landing?.bonusesText ?? ""} maxLength={3000} placeholder={"Template kalender konten|Senilai Rp99.000\nChecklist promosi|Siap pakai"} /><small className="field-hint">Satu bonus per baris dengan format: Nama bonus | Keterangan.</small></div>
        <div className="field"><label htmlFor="testimonialsText">Testimoni</label><textarea className="input" id="testimonialsText" name="testimonialsText" defaultValue={landing?.testimonialsText ?? ""} maxLength={5000} placeholder={"Dina|Pemilik UMKM|Materinya praktis dan langsung bisa dipakai.\nRaka|Content creator|Saya jadi punya strategi promosi yang jelas."} /><small className="field-hint">Format per baris: Nama | Peran | Testimoni.</small></div>
        <div className="field"><label htmlFor="faqText">FAQ</label><textarea className="input" id="faqText" name="faqText" defaultValue={landing?.faqText ?? ""} maxLength={5000} placeholder={"Apakah kelas cocok untuk pemula?|Ya, materi dimulai dari dasar.\nBerapa lama aksesnya?|Akses mengikuti ketentuan produk."} /><small className="field-hint">Format per baris: Pertanyaan | Jawaban.</small></div>

        <div className="builder-section-head"><span>03</span><div><h2>Harga dan jaminan</h2><p>Tampilkan nilai penawaran dan batas promo secara transparan.</p></div></div>
        <div className="two-field"><div className="field"><label htmlFor="compareAtPrice">Harga normal/coret</label><input className="input" id="compareAtPrice" name="compareAtPrice" type="number" min={product.price} step={1000} defaultValue={landing?.compareAtPrice ?? ""} placeholder={String(product.price * 2)} /></div><div className="field"><label htmlFor="promoEndsAt">Promo berakhir</label><input className="input" id="promoEndsAt" name="promoEndsAt" type="datetime-local" defaultValue={localDateTime(landing?.promoEndsAt)} /></div></div>
        <div className="two-field"><div className="field"><label htmlFor="guaranteeTitle">Judul jaminan</label><input className="input" id="guaranteeTitle" name="guaranteeTitle" defaultValue={landing?.guaranteeTitle ?? ""} maxLength={120} placeholder="Belanja dengan tenang" /></div><div className="field"><label htmlFor="ctaText">Tulisan tombol beli</label><input className="input" id="ctaText" name="ctaText" defaultValue={landing?.ctaText ?? "Mulai belajar"} minLength={2} maxLength={60} /></div></div>
        <div className="field"><label htmlFor="guaranteeText">Penjelasan jaminan/refund</label><textarea className="input" id="guaranteeText" name="guaranteeText" defaultValue={landing?.guaranteeText ?? ""} maxLength={1500} placeholder="Tuliskan kebijakan secara jujur. Jangan menjanjikan refund jika merchant tidak menyediakannya." /></div>

        <div className="builder-section-head"><span>04</span><div><h2>Pixel dan atribusi</h2><p>ID provider saja; Lajurin tidak menerima script bebas demi keamanan.</p></div></div>
        <div className="two-field"><div className="field"><label htmlFor="facebookPixelId">Meta Pixel ID</label><input className="input" id="facebookPixelId" name="facebookPixelId" inputMode="numeric" defaultValue={landing?.facebookPixelId ?? ""} maxLength={40} /></div><div className="field"><label htmlFor="tiktokPixelId">TikTok Pixel ID</label><input className="input" id="tiktokPixelId" name="tiktokPixelId" defaultValue={landing?.tiktokPixelId ?? ""} maxLength={40} /></div></div>
        <button className="btn btn-primary btn-large" type="submit">Simpan seluruh landing page</button>
      </form></section>
    </section>
    <aside className="stack builder-aside"><section className="panel landing-editor-help"><LayoutTemplate size={34} /><small>HALAMAN PUBLIK</small><h2 className="display">/p/{product.slug}</h2><p>Hero, media, manfaat, pengajar, bonus, testimoni, FAQ, kurikulum, harga, jaminan, dan profil merchant tersusun otomatis.</p><ul><li>Template dapat diganti tanpa kehilangan isi.</li><li>UTM dicatat ke transaksi dan analitik.</li><li>Pixel hanya aktif jika ID diisi.</li></ul></section><section className="panel builder-tip"><Sparkles size={22} /><strong>Langkah berikutnya</strong><p>Simpan landing page, lalu buka <Link href={`/dashboard/products/${product.id}/funnel`}>Kupon & Funnel</Link> untuk membuat penawaran checkout.</p></section></aside></div>
  </div></main>;
}
