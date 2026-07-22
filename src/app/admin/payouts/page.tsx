import { desc, eq } from "drizzle-orm";
import { reviewPayoutAction } from "@/app/actions/finance";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate } from "@/lib/order";
import { merchantPayouts, merchantProfiles, users } from "@/lib/schema";

const statusLabels = { REQUESTED: "Menunggu", PAID: "Dibayar", REJECTED: "Ditolak" };

export default async function AdminPayoutsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { error, success } = await searchParams;
  const rows = await db.select({ payout: merchantPayouts, merchantName: users.name, brandName: merchantProfiles.brandName })
    .from(merchantPayouts).innerJoin(users, eq(merchantPayouts.merchantId, users.id))
    .innerJoin(merchantProfiles, eq(merchantProfiles.userId, users.id)).orderBy(desc(merchantPayouts.createdAt)).limit(100);
  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">Payout merchant</h1><p>Transfer dilakukan di bank terlebih dahulu, lalu tandai dibayar dengan referensi transfer.</p></div></div>{error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}<div className="stack">{rows.length ? rows.map(({ payout, merchantName, brandName }) => <article className="panel payout-review" key={payout.id}><div><span className={`badge status-${payout.status.toLowerCase()}`}>{statusLabels[payout.status]}</span><h2>{formatRupiah(payout.amount)} · {brandName}</h2><p>{merchantName} · diajukan {formatDate(payout.createdAt)}</p><dl className="detail-list"><div><dt>Bank</dt><dd>{payout.bankName}</dd></div><div><dt>Rekening</dt><dd>{payout.accountNumber}</dd></div><div><dt>Atas nama</dt><dd>{payout.accountHolder}</dd></div></dl>{payout.merchantNote && <p className="note">Catatan merchant: {payout.merchantNote}</p>}{payout.adminNote && <p className="note">Catatan admin: {payout.adminNote}</p>}{payout.transferReference && <p className="note">Referensi transfer: {payout.transferReference}</p>}</div>{payout.status === "REQUESTED" && <div className="payout-actions"><form className="form compact-form" action={reviewPayoutAction.bind(null, payout.id, "pay")}><input className="input" name="transferReference" required maxLength={120} placeholder="Referensi transfer" /><input className="input" name="adminNote" maxLength={500} placeholder="Catatan admin (opsional)" /><button className="btn btn-lime" type="submit">Sudah ditransfer</button></form><form action={reviewPayoutAction.bind(null, payout.id, "reject")}><input type="hidden" name="adminNote" value="Permintaan payout ditolak admin" /><button className="btn btn-danger" type="submit">Tolak & kembalikan saldo</button></form></div>}</article>) : <section className="panel empty"><p>Belum ada permintaan payout.</p></section>}</div></div></main>;
}
