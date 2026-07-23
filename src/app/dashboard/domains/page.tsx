import { asc, eq } from "drizzle-orm";
import { addWorkspaceDomainAction, removeWorkspaceDomainAction, verifyWorkspaceDomainAction } from "@/app/actions/domain";
import { requireFeature } from "@/lib/feature-flags";
import { requireMerchantWorkspace } from "@/lib/merchant-workspace";
import { db } from "@/lib/db";
import { workspaceDomains } from "@/lib/schema";

const statusLabel = { PENDING: "Menunggu DNS", VERIFIED: "Terverifikasi", FAILED: "Belum ditemukan", DISABLED: "Dinonaktifkan" };

export default async function DomainsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.manage");
  await requireFeature("CUSTOM_DOMAINS", merchant.id);
  const { error, success } = await searchParams;
  const domains = await db.select().from(workspaceDomains).where(eq(workspaceDomains.workspaceId, workspace.id)).orderBy(asc(workspaceDomains.createdAt));
  const canonical = new URL(process.env.APP_URL ?? "http://localhost:3000").hostname;
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Custom Domain</span><h1 className="display" style={{ marginTop: 12 }}>Domain toko</h1><p>Hubungkan domain sendiri ke halaman publik Lajurin.</p></div></div>{error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}<div className="two-col"><section className="panel"><div className="panel-head"><h2>Tambah domain</h2></div><form className="form panel-form" action={addWorkspaceDomainAction}><div className="field"><label htmlFor="hostname">Nama domain</label><input className="input" id="hostname" name="hostname" required placeholder="kelas.domainanda.com" /></div><button className="btn btn-primary" type="submit">Tambahkan domain</button></form></section><section className="panel"><div className="panel-head"><h2>Persiapan routing</h2></div><ol className="domain-steps"><li>Buat TXT sesuai token yang muncul.</li><li>Arahkan CNAME domain ke <strong>{canonical}</strong>.</li><li>Tambahkan domain yang sama pada resource aplikasi di Coolify agar HTTPS aktif.</li><li>Klik Verifikasi setelah DNS terpropagasi.</li></ol></section></div><section className="panel"><div className="panel-head"><h2>Domain terdaftar</h2><span className="badge">{domains.length}</span></div>{domains.length ? domains.map((domain) => <article className="domain-row" key={domain.id}><div><strong>{domain.hostname}</strong><small>Status: {statusLabel[domain.status]}</small>{domain.verificationToken && <code>TXT _lajurin.{domain.hostname} = lajurin-verification={domain.verificationToken}</code>}</div><div className="actions"><form action={verifyWorkspaceDomainAction.bind(null, domain.id)}><button className="btn" type="submit">Verifikasi</button></form><form action={removeWorkspaceDomainAction.bind(null, domain.id)}><button className="btn btn-danger" type="submit">Hapus</button></form></div></article>) : <div className="empty"><p>Belum ada custom domain.</p></div>}</section></div></main>;
}
