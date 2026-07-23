/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ExternalLink, Store } from "lucide-react";
import { updateMerchantProfileAction } from "@/app/actions/merchant";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { merchantProfiles } from "@/lib/schema";

export default async function MerchantProfilePage({ searchParams }: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const merchant = await requireMerchant("manage");
  const { error, success } = await searchParams;
  const [profile] = await db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, merchant.id)).limit(1);
  const suggestedSlug = `${slugify(merchant.name) || "toko"}-${merchant.id.slice(0, 6)}`;

  return <main className="app-main"><div className="shell profile-shell">
    <div className="page-head"><div><span className="eyebrow">Identitas merchant</span><h1 className="display" style={{ marginTop: 12 }}>Profil toko</h1><p>Profil ini membedakan usaha Anda dari merchant lain di Lajurin.</p></div>{profile && <Link className="btn" href={`/m/${profile.slug}`} target="_blank">Lihat toko <ExternalLink size={15} /></Link>}</div>
    {error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}
    <div className="profile-layout"><section className="panel form-panel"><form className="form" action={updateMerchantProfileAction}>
      <div className="field"><label htmlFor="brandName">Nama toko/brand</label><input className="input" id="brandName" name="brandName" defaultValue={profile?.brandName ?? merchant.name} required minLength={2} /></div>
      <div className="field"><label htmlFor="slug">Alamat toko</label><div className="input-prefix"><span>/m/</span><input id="slug" name="slug" defaultValue={profile?.slug ?? suggestedSlug} required minLength={3} /></div><small className="field-hint">Gunakan huruf kecil, angka, dan tanda hubung.</small></div>
      <div className="field"><label htmlFor="headline">Kalimat utama</label><input className="input" id="headline" name="headline" defaultValue={profile?.headline ?? ""} maxLength={180} placeholder="Contoh: Belajar praktis untuk bertumbuh lebih cepat" /></div>
      <div className="field"><label htmlFor="bio">Tentang merchant</label><textarea className="input" id="bio" name="bio" defaultValue={profile?.bio ?? ""} maxLength={1500} placeholder="Ceritakan keahlian, pengalaman, atau fokus brand Anda." /></div>
      <div className="field"><label htmlFor="logoUrl">URL logo/foto</label><input className="input" id="logoUrl" name="logoUrl" type="url" defaultValue={profile?.logoUrl ?? ""} placeholder="https://..." /></div>
      <div className="two-field"><div className="field"><label htmlFor="supportEmail">Email dukungan</label><input className="input" id="supportEmail" name="supportEmail" type="email" defaultValue={profile?.supportEmail ?? merchant.email} /></div><div className="field"><label htmlFor="whatsapp">WhatsApp merchant</label><input className="input" id="whatsapp" name="whatsapp" type="tel" defaultValue={profile?.whatsapp ?? ""} placeholder="62812..." /></div></div>
      <div className="field color-field"><label htmlFor="accentColor">Warna brand</label><input id="accentColor" name="accentColor" type="color" defaultValue={profile?.accentColor ?? "#163d2d"} /></div>
      <button className="btn btn-primary" type="submit">Simpan profil toko</button>
    </form></section>
    <aside className="panel profile-preview"><span className="profile-logo">{profile?.logoUrl ? <img src={profile.logoUrl} alt="" /> : <Store size={28} />}</span><small>PRATINJAU TOKO</small><h2 className="display">{profile?.brandName ?? merchant.name}</h2><p>{profile?.headline || "Kalimat utama merchant akan tampil di sini."}</p><span className="badge badge-live">Merchant Lajurin</span></aside></div>
  </div></main>;
}
