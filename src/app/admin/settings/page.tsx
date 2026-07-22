import { eq } from "drizzle-orm";
import { updatePlatformSettingsAction } from "@/app/actions/admin";
import { db } from "@/lib/db";
import { DEFAULT_MINIMUM_PAYOUT, DEFAULT_PLATFORM_FEE_BPS } from "@/lib/finance";
import { formatRupiah } from "@/lib/format";
import { platformSettings } from "@/lib/schema";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { error, success } = await searchParams;
  const [settings] = await db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1);
  const feeBps = settings?.defaultPlatformFeeBps ?? DEFAULT_PLATFORM_FEE_BPS;
  const minimum = settings?.minimumPayoutAmount ?? DEFAULT_MINIMUM_PAYOUT;
  return <main className="app-main"><div className="shell settings-shell"><div className="page-head"><div><h1 className="display">Pengaturan platform</h1><p>Aturan keuangan berlaku untuk transaksi baru. Snapshot transaksi lama tidak ikut berubah.</p></div></div>{error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}<section className="panel"><div className="panel-head"><h2>Komisi & payout</h2></div><form className="form panel-form" action={updatePlatformSettingsAction}><div className="field"><label htmlFor="defaultFeePercent">Komisi default platform (%)</label><input className="input" id="defaultFeePercent" name="defaultFeePercent" type="number" min="0" max="100" step="0.01" defaultValue={feeBps / 100} required /><small className="field-hint">Merchant dapat memiliki komisi khusus. Jika kosong, merchant mengikuti nilai default ini.</small></div><div className="field"><label htmlFor="minimumPayoutAmount">Minimum payout merchant</label><input className="input" id="minimumPayoutAmount" name="minimumPayoutAmount" type="number" min="1" step="1" defaultValue={minimum} required /><small className="field-hint">Saat ini {formatRupiah(minimum)}.</small></div><button className="btn btn-primary" type="submit">Simpan pengaturan</button></form></section></div></main>;
}
