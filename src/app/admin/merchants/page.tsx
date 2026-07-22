import Link from "next/link";
import { and, count, eq, sql } from "drizzle-orm";
import { updateMerchantFeeAction, updateMerchantStatusAction } from "@/app/actions/admin";
import { db } from "@/lib/db";
import { DEFAULT_PLATFORM_FEE_BPS, formatFeePercent } from "@/lib/finance";
import { formatRupiah } from "@/lib/format";
import { merchantLedgerEntries, merchantPayoutAccounts, merchantProfiles, orders, platformSettings, products, users } from "@/lib/schema";

export default async function AdminMerchantsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { error, success } = await searchParams;
  const [[settings], merchants] = await Promise.all([
    db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1),
    db.select({ user: users, profile: merchantProfiles, payoutBank: merchantPayoutAccounts.bankName })
      .from(users).innerJoin(merchantProfiles, eq(merchantProfiles.userId, users.id))
      .leftJoin(merchantPayoutAccounts, eq(merchantPayoutAccounts.merchantId, users.id))
      .where(eq(users.role, "MERCHANT")).orderBy(users.createdAt),
  ]);
  const rows = await Promise.all(merchants.map(async (merchant) => {
    const [[productCount], paid, [balanceRow]] = await Promise.all([
      db.select({ value: count() }).from(products).where(eq(products.merchantId, merchant.user.id)),
      db.select({ gross: orders.amount, fee: orders.platformFeeAmount, net: orders.merchantNetAmount }).from(orders)
        .innerJoin(products, eq(orders.productId, products.id))
        .where(and(eq(products.merchantId, merchant.user.id), eq(orders.status, "PAID"))),
      db.select({ balance: sql<number>`coalesce(sum(${merchantLedgerEntries.amount}), 0)::integer` }).from(merchantLedgerEntries)
        .where(eq(merchantLedgerEntries.merchantId, merchant.user.id)),
    ]);
    return { ...merchant, productCount: productCount.value, gross: paid.reduce((sum, row) => sum + row.gross, 0), net: paid.reduce((sum, row) => sum + (row.net ?? row.gross), 0), balance: Number(balanceRow?.balance ?? 0) };
  }));
  const defaultFee = settings?.defaultPlatformFeeBps ?? DEFAULT_PLATFORM_FEE_BPS;

  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">Kelola merchant</h1><p>Aktivasi toko, atur komisi khusus, dan pantau saldo setiap merchant.</p></div><Link className="btn" href="/admin/settings">Komisi default {formatFeePercent(defaultFee)}</Link></div>{error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}<div className="stack">{rows.map((row) => <article className="panel merchant-admin-card" key={row.user.id}><div><div className="merchant-title"><span className={`badge status-${row.profile.status.toLowerCase()}`}>{row.profile.status}</span><h2>{row.profile.brandName}</h2></div><p>{row.user.name} · {row.user.email}</p><div className="mini-stats"><span><small>Produk</small><strong>{row.productCount}</strong></span><span><small>Penjualan kotor</small><strong>{formatRupiah(row.gross)}</strong></span><span><small>Pendapatan bersih</small><strong>{formatRupiah(row.net)}</strong></span><span><small>Saldo</small><strong>{formatRupiah(row.balance)}</strong></span></div><small className="muted">Rekening payout: {row.payoutBank ?? "belum diisi"}</small></div><div className="merchant-admin-actions"><form className="inline-form" action={updateMerchantFeeAction.bind(null, row.user.id)}><label>Komisi khusus (%)</label><input className="input input-small" name="feePercent" type="number" min="0" max="100" step="0.01" defaultValue={row.profile.platformFeeBps === null ? "" : row.profile.platformFeeBps / 100} placeholder={`Default ${defaultFee / 100}`} /><button className="btn btn-compact" type="submit">Simpan</button></form><div className="actions">{row.profile.status !== "ACTIVE" && <form action={updateMerchantStatusAction.bind(null, row.user.id, "ACTIVE")}><button className="btn btn-lime btn-compact" type="submit">Aktifkan</button></form>}{row.profile.status !== "SUSPENDED" && <form action={updateMerchantStatusAction.bind(null, row.user.id, "SUSPENDED")}><button className="btn btn-danger btn-compact" type="submit">Tangguhkan</button></form>}</div><small className="muted">Komisi efektif: {formatFeePercent(row.profile.platformFeeBps ?? defaultFee)}</small></div></article>)}</div></div></main>;
}
