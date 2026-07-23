import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateMerchantControlAction } from "@/app/actions/admin";
import { db } from "@/lib/db";
import { DEFAULT_PLATFORM_FEE_BPS, formatFeePercent } from "@/lib/finance";
import { merchantProfiles, platformSettings, users } from "@/lib/schema";

const statusLabels = {
  PENDING: "Menunggu verifikasi",
  ACTIVE: "Aktif / terverifikasi",
  SUSPENDED: "Ditangguhkan",
} as const;

export default async function AdminMerchantEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ merchantId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [{ merchantId }, { error, success }] = await Promise.all([params, searchParams]);
  const [[merchant], [settings]] = await Promise.all([
    db.select({ user: users, profile: merchantProfiles }).from(users)
      .innerJoin(merchantProfiles, eq(merchantProfiles.userId, users.id))
      .where(and(eq(users.id, merchantId), eq(users.role, "MERCHANT"))).limit(1),
    db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1),
  ]);
  if (!merchant) notFound();

  const defaultFee = settings?.defaultPlatformFeeBps ?? DEFAULT_PLATFORM_FEE_BPS;
  const action = updateMerchantControlAction.bind(null, merchantId);

  return <main className="app-main"><div className="shell admin-control-shell">
    <div className="page-head"><div><span className="eyebrow">Control plane merchant</span><h1 className="display" style={{marginTop:12}}>Edit {merchant.profile.brandName}</h1><p>Kelola identitas akun, kontak administratif, verifikasi, dan komisi platform.</p></div><Link className="btn" href="/admin/merchants">← Kembali ke merchant</Link></div>
    {error && <p className="alert">{error}</p>}
    {success && <p className="alert alert-success">{success}</p>}
    <div className="profile-layout">
      <section className="panel"><div className="panel-head"><h2>Data kontrol merchant</h2><span className={`badge status-${merchant.profile.status.toLowerCase()}`}>{statusLabels[merchant.profile.status]}</span></div><form className="form panel-form" action={action}>
        <div className="two-field"><div className="field"><label htmlFor="ownerName">Nama pemilik akun</label><input className="input" id="ownerName" name="ownerName" defaultValue={merchant.user.name} minLength={2} maxLength={80} required /></div><div className="field"><label htmlFor="loginEmail">Email login</label><input className="input" id="loginEmail" name="loginEmail" type="email" defaultValue={merchant.user.email} maxLength={254} required /><small className="field-hint">Perubahan berlaku pada login merchant berikutnya.</small></div></div>
        <div className="field"><label htmlFor="supportEmail">Email kontak/support</label><input className="input" id="supportEmail" name="supportEmail" type="email" defaultValue={merchant.profile.supportEmail ?? ""} maxLength={254} placeholder="Opsional" /><small className="field-hint">Kontak operasional toko; tidak mengubah email login jika dikosongkan.</small></div>
        <div className="two-field"><div className="field"><label htmlFor="status">Status verifikasi</label><select className="input" id="status" name="status" defaultValue={merchant.profile.status}><option value="PENDING">Menunggu verifikasi</option><option value="ACTIVE">Aktif / terverifikasi</option><option value="SUSPENDED">Ditangguhkan</option></select></div><div className="field"><label htmlFor="plan">Paket platform</label><select className="input" id="plan" name="plan" defaultValue={merchant.profile.plan}><option value="STARTER">Starter</option><option value="PRO">Pro</option><option value="BUSINESS">Business</option></select></div></div>
        <div className="field"><label htmlFor="feePercent">Komisi khusus (%)</label><input className="input" id="feePercent" name="feePercent" type="number" min="0" max="100" step="0.01" defaultValue={merchant.profile.platformFeeBps === null ? "" : merchant.profile.platformFeeBps / 100} placeholder={`Ikuti default ${defaultFee / 100}%`} /><small className="field-hint">Kosongkan untuk mengikuti default platform {formatFeePercent(defaultFee)}.</small></div>
        <button className="btn btn-primary" type="submit">Simpan perubahan merchant</button>
      </form></section>
      <aside className="stack"><section className="panel form-panel"><span className="eyebrow">Batas akses admin</span><h2>Data usaha tetap milik merchant</h2><p className="muted">Admin tidak mengubah brand, logo, WhatsApp, rekening, produk, landing page, atau konten toko dari halaman ini.</p></section><section className="panel form-panel"><h2>Audit otomatis</h2><p className="muted">Setiap perubahan disimpan sebagai <strong>MERCHANT CONTROL UPDATED</strong> beserta kolom yang berubah, admin pelaksana, dan waktu tindakan.</p><Link className="btn btn-compact" href="/admin/audit">Buka audit log</Link></section></aside>
    </div>
  </div></main>;
}
