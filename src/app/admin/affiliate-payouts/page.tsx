import { desc, eq } from "drizzle-orm";
import { reviewAffiliatePayoutAction } from "@/app/actions/affiliate";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate } from "@/lib/order";
import { affiliatePayoutRequests, users } from "@/lib/schema";

export default async function AdminAffiliatePayoutsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const rows = await db.select({ payout: affiliatePayoutRequests, user: users }).from(affiliatePayoutRequests)
    .innerJoin(users, eq(users.id, affiliatePayoutRequests.userId)).orderBy(desc(affiliatePayoutRequests.createdAt)).limit(200);
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Keuangan affiliate</span><h1 className="display">Pencairan affiliate</h1><p>Verifikasi rekening dan bukti transfer sebelum menandai pencairan telah dibayar.</p></div></div>
    {query.error && <p className="alert">{query.error}</p>}{query.success && <p className="alert alert-success">{query.success}</p>}
    <section className="panel">{rows.length ? rows.map(({ payout, user }) => <article className="report-row" key={payout.id}><div><span className={`badge ${payout.status === "PAID" ? "status-paid" : payout.status === "REJECTED" ? "status-failed" : "status-pending"}`}>{payout.status}</span><h3>{user.name} · {formatRupiah(payout.amount)}</h3><p>{payout.bankName} · {payout.accountNumber} · a.n. {payout.accountHolder}</p><small>{user.email} · Diajukan {formatDate(payout.createdAt)}</small>{payout.adminNote && <blockquote>{payout.adminNote}</blockquote>}</div>{payout.status === "REQUESTED" && <form className="form"><textarea className="input" name="note" required minLength={3} placeholder="Catatan dan/atau referensi transfer" /><div className="actions"><button className="btn btn-primary" formAction={reviewAffiliatePayoutAction.bind(null, payout.id, "PAID")}>Sudah dibayar</button><button className="btn" formAction={reviewAffiliatePayoutAction.bind(null, payout.id, "REJECTED")}>Tolak</button></div></form>}</article>) : <div className="empty"><p>Belum ada permintaan pencairan.</p></div>}</section>
  </div></main>;
}
