import { desc, eq, sql } from "drizzle-orm";
import { requestAffiliatePayoutAction } from "@/app/actions/affiliate";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate } from "@/lib/order";
import { affiliateClicks, affiliateCommissions, affiliatePartners, affiliatePayoutRequests, affiliatePrograms, products } from "@/lib/schema";

export default async function MemberAffiliatesPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const rows = await db.select({
    partner: affiliatePartners,
    program: affiliatePrograms,
    product: products,
    clicks: sql<number>`count(distinct ${affiliateClicks.id})::int`,
  }).from(affiliatePartners)
    .innerJoin(affiliatePrograms, eq(affiliatePrograms.id, affiliatePartners.programId))
    .innerJoin(products, eq(products.id, affiliatePrograms.productId))
    .leftJoin(affiliateClicks, eq(affiliateClicks.partnerId, affiliatePartners.id))
    .where(eq(affiliatePartners.userId, user.id))
    .groupBy(affiliatePartners.id, affiliatePrograms.id, products.id)
    .orderBy(desc(affiliatePartners.createdAt));
  const commissions = await db.select({ commission: affiliateCommissions, partnerId: affiliatePartners.id })
    .from(affiliateCommissions).innerJoin(affiliatePartners, eq(affiliatePartners.id, affiliateCommissions.partnerId))
    .where(eq(affiliatePartners.userId, user.id));
  const payouts = await db.select().from(affiliatePayoutRequests)
    .where(eq(affiliatePayoutRequests.userId, user.id)).orderBy(desc(affiliatePayoutRequests.createdAt)).limit(20);
  const pendingBalance = commissions.filter((row) => row.commission.status === "PENDING").reduce((sum, row) => sum + row.commission.amount, 0);
  const paidTotal = commissions.filter((row) => row.commission.status === "PAID").reduce((sum, row) => sum + row.commission.amount, 0);
  const hasActiveRequest = payouts.some((row) => row.status === "REQUESTED");

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><span className="eyebrow">Penghasilan tambahan</span><h1 className="display">Affiliate saya</h1><p>Bagikan tautan Anda, pantau klik dan penjualan, lalu ajukan pencairan melalui rekening sendiri.</p></div></div>
    {query.error && <p className="alert">{query.error}</p>}{query.success && <p className="alert alert-success">{query.success}</p>}
    <div className="stats stats-4"><article className="stat"><strong>{rows.reduce((sum, row) => sum + row.clicks, 0)}</strong><span>Klik tercatat</span></article><article className="stat"><strong>{commissions.length}</strong><span>Penjualan berhasil</span></article><article className="stat"><strong>{formatRupiah(pendingBalance)}</strong><span>Siap dicairkan</span></article><article className="stat"><strong>{formatRupiah(paidTotal)}</strong><span>Sudah dibayar</span></article></div>
    <section className="panel"><div className="panel-head"><h2>Tautan affiliate</h2></div>{rows.length ? rows.map(({ partner, program, product, clicks }) => {
      const own = commissions.filter((row) => row.partnerId === partner.id);
      return <div className="finance-row" key={partner.id}><div><strong>{product.name}</strong><small>Komisi {program.commissionBps / 100}% · {clicks} klik · {own.length} penjualan</small><code>{`${process.env.APP_URL ?? "https://rizqhub.id"}/r/${partner.code}`}</code></div><div><strong>{formatRupiah(own.reduce((sum, row) => sum + row.commission.amount, 0))}</strong><small>Total komisi</small></div></div>;
    }) : <div className="empty"><p>Belum ada program affiliate untuk akun Anda.</p></div>}</section>
    <div className="settings-grid">
      <section className="panel"><h2>Ajukan pencairan</h2><p className="muted">Minimum Rp50.000. Saldo penuh yang tersedia akan diajukan dan diperiksa admin.</p><form className="form" action={requestAffiliatePayoutAction}><label>Nama bank<input className="input" name="bankName" placeholder="Contoh: BCA" required /></label><label>Nomor rekening<input className="input" name="accountNumber" inputMode="numeric" placeholder="Hanya angka" required /></label><label>Nama pemilik rekening<input className="input" name="accountHolder" placeholder="Sesuai rekening" required /></label><button className="btn btn-primary" disabled={pendingBalance < 50_000 || hasActiveRequest} type="submit">{hasActiveRequest ? "Sedang diproses" : `Cairkan ${formatRupiah(pendingBalance)}`}</button></form></section>
      <section className="panel"><h2>Riwayat pencairan</h2>{payouts.length ? payouts.map((payout) => <div className="finance-row" key={payout.id}><div><strong>{formatRupiah(payout.amount)}</strong><small>{payout.bankName} · {payout.accountNumber} · {formatDate(payout.createdAt)}</small>{payout.adminNote && <small>Catatan: {payout.adminNote}</small>}</div><span className={`badge ${payout.status === "PAID" ? "status-paid" : payout.status === "REJECTED" ? "status-failed" : "status-pending"}`}>{payout.status}</span></div>) : <div className="empty"><p>Belum ada riwayat pencairan.</p></div>}</section>
    </div>
  </div></main>;
}
