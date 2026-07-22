import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { ExternalLink, LayoutTemplate } from "lucide-react";
import { notFound } from "next/navigation";
import { updateLandingPageAction } from "@/app/actions/merchant";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { productLandingPages, products } from "@/lib/schema";

export default async function LandingPageEditor({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const merchant = await requireMerchant();
  const { id } = await params;
  const { error, success } = await searchParams;
  const [row] = await db.select({ product: products, landing: productLandingPages }).from(products)
    .leftJoin(productLandingPages, eq(productLandingPages.productId, products.id))
    .where(and(eq(products.id, id), eq(products.merchantId, merchant.id))).limit(1);
  if (!row) notFound();
  const { product, landing } = row;

  return <main className="app-main"><div className="shell profile-shell">
    <div className="page-head"><div><span className="eyebrow">Landing page produk</span><h1 className="display" style={{ marginTop: 12 }}>{product.name}</h1><p>Atur halaman penjualan tanpa mengubah isi kelas.</p></div><div className="actions"><Link className="btn" href={`/dashboard/products/${product.id}`}>Kembali ke produk</Link><Link className="btn" href={`/p/${product.slug}`} target="_blank">Pratinjau <ExternalLink size={15} /></Link></div></div>
    {error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}
    <div className="profile-layout"><section className="panel form-panel"><form className="form" action={updateLandingPageAction.bind(null, product.id)}>
      <div className="field"><label htmlFor="eyebrow">Label kecil di atas judul</label><input className="input" id="eyebrow" name="eyebrow" defaultValue={landing?.eyebrow ?? "Kursus digital"} maxLength={80} /></div>
      <div className="field"><label htmlFor="heroTitle">Judul utama</label><input className="input" id="heroTitle" name="heroTitle" defaultValue={landing?.heroTitle ?? product.headline} maxLength={180} /></div>
      <div className="field"><label htmlFor="heroSubtitle">Penjelasan utama</label><textarea className="input" id="heroSubtitle" name="heroSubtitle" defaultValue={landing?.heroSubtitle ?? product.description} maxLength={1000} /></div>
      <div className="field"><label htmlFor="coverImageUrl">URL gambar sampul</label><input className="input" id="coverImageUrl" name="coverImageUrl" type="url" defaultValue={landing?.coverImageUrl ?? ""} placeholder="https://..." /><small className="field-hint">Opsional. Gunakan gambar landscape agar hasilnya rapi.</small></div>
      <div className="field"><label htmlFor="benefitsText">Manfaat utama</label><textarea className="input" id="benefitsText" name="benefitsText" defaultValue={landing?.benefitsText ?? ""} maxLength={3000} placeholder={"Satu manfaat per baris\nMateri dapat dipelajari kapan saja\nAkses komunitas member"} /><small className="field-hint">Tulis satu manfaat pada setiap baris.</small></div>
      <div className="field"><label htmlFor="audienceText">Cocok untuk siapa</label><textarea className="input" id="audienceText" name="audienceText" defaultValue={landing?.audienceText ?? ""} maxLength={1500} placeholder="Jelaskan siapa yang paling cocok mengikuti kelas ini." /></div>
      <div className="two-field"><div className="field"><label htmlFor="ctaText">Tulisan tombol beli</label><input className="input" id="ctaText" name="ctaText" defaultValue={landing?.ctaText ?? "Dapatkan akses"} minLength={2} maxLength={60} /></div><div className="field color-field"><label htmlFor="accentColor">Warna landing page</label><input id="accentColor" name="accentColor" type="color" defaultValue={landing?.accentColor ?? "#163d2d"} /></div></div>
      <button className="btn btn-primary" type="submit">Simpan landing page</button>
    </form></section>
    <aside className="panel landing-editor-help"><LayoutTemplate size={34} /><small>HASIL PUBLIK</small><h2 className="display">/p/{product.slug}</h2><p>Judul, gambar, manfaat, sasaran peserta, tombol beli, kurikulum, harga, dan profil merchant akan tersusun otomatis.</p><ul><li>Landing page hanya menampilkan produk ini.</li><li>Halaman toko menampilkan semua produk merchant.</li><li>Merchant lain tidak dapat mengedit halaman ini.</li></ul></aside></div>
  </div></main>;
}
