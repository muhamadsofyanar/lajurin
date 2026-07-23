import { and, desc, eq, sql } from "drizzle-orm";
import { BadgeDollarSign, Landmark, WalletCards } from "lucide-react";
import { requestPayoutAction, updateManualPaymentAccountAction, updatePayoutAccountAction } from "@/app/actions/finance";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_MINIMUM_PAYOUT, DEFAULT_PLATFORM_FEE_BPS, formatFeePercent, getMerchantBalance } from "@/lib/finance";
import { formatRupiah } from "@/lib/format";
import { featureEnabled } from "@/lib/feature-flags";
import { formatDate } from "@/lib/order";
import { merchantLedgerEntries, merchantManualPaymentAccounts, merchantPayoutAccounts, merchantPayouts, merchantProfiles, orders, platformReceivableEntries, platformSettings, products } from "@/lib/schema";

const ledgerLabels = {
  SALE: "Penjualan",
  PAYOUT: "Pencairan diajukan",
  PAYOUT_REVERSAL: "Pengembalian payout",
  REFUND: "Refund",
  ADJUSTMENT: "Penyesuaian admin",
};

const payoutLabels = { REQUESTED: "Menunggu admin", PAID: "Sudah dibayar", REJECTED: "Ditolak" };

export default async function MerchantFinancePage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const merchant = await requireMerchant("finance");
  if (merchant.role !== "MERCHANT") return null;
  const { error, success } = await searchParams;
  const [[profile], [account], [manualAccount], [settings], ledger, payouts, paidOrders, balance, [receivable]] = await Promise.all([
    db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, merchant.id)).limit(1),
    db.select().from(merchantPayoutAccounts).where(eq(merchantPayoutAccounts.merchantId, merchant.id)).limit(1),
    db.select().from(merchantManualPaymentAccounts).where(eq(merchantManualPaymentAccounts.merchantId, merchant.id)).limit(1),
    db.select().from(platformSettings).where(eq(platformSettings.id, 1)).limit(1),
    db.select().from(merchantLedgerEntries).where(eq(merchantLedgerEntries.merchantId, merchant.id)).orderBy(desc(merchantLedgerEntries.createdAt)).limit(40),
    db.select().from(merchantPayouts).where(eq(merchantPayouts.merchantId, merchant.id)).orderBy(desc(merchantPayouts.createdAt)).limit(20),
    db.select({ amount: orders.amount, fee: orders.platformFeeAmount, net: orders.merchantNetAmount }).from(orders)
      .innerJoin(products, eq(orders.productId, products.id))
      .where(and(eq(products.merchantId, merchant.id), eq(orders.status, "PAID"))),
    getMerchantBalance(merchant.id),
    db.select({ balance: sql<number>`coalesce(sum(${platformReceivableEntries.amount}), 0)::integer` }).from(platformReceivableEntries).where(eq(platformReceivableEntries.merchantId, merchant.id)),
  ]);
  const gross = paidOrders.reduce((sum, row) => sum + row.amount, 0);
  const fees = paidOrders.reduce((sum, row) => sum + (row.fee ?? 0), 0);
  const feeBps = profile?.platformFeeBps ?? settings?.defaultPlatformFeeBps ?? DEFAULT_PLATFORM_FEE_BPS;
  const minimum = settings?.minimumPayoutAmount ?? DEFAULT_MINIMUM_PAYOUT;
  const canRequest = profile?.status === "ACTIVE" && Boolean(account) && balance >= minimum;
  const commissionDue = Number(receivable?.balance ?? 0);
  const directManualEnabled = await featureEnabled("DIRECT_MANUAL_PAYMENTS", merchant.id);

  return <main className="app-main"><div className="shell finance-shell"><div className="page-head"><div><span className="eyebrow">Keuangan merchant</span><h1 className="display" style={{marginTop:12}}>Saldo & pencairan</h1><p>Komisi aktif {formatFeePercent(feeBps)}. Saldo dihitung dari ledger transaksi, bukan angka yang dapat diedit langsung.</p></div></div>
    {error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}
    {profile?.status !== "ACTIVE" && <p className="alert">Payout belum tersedia karena status merchant saat ini {profile?.status === "SUSPENDED" ? "ditangguhkan" : "menunggu aktivasi admin"}.</p>}
    {!directManualEnabled && <p className="alert">Transfer langsung ke rekening merchant belum diaktifkan admin. Rekening yang tersimpan tidak digunakan untuk checkout sampai feature flag aktif.</p>}
    <section className="stats stats-4"><div className="stat"><span>Penjualan kotor</span><strong>{formatRupiah(gross)}</strong></div><div className="stat"><span>Komisi platform</span><strong>{formatRupiah(fees)}</strong></div><div className="stat"><span>Tagihan komisi</span><strong>{formatRupiah(commissionDue)}</strong></div><div className="stat stat-highlight"><span>Saldo payout</span><strong>{formatRupiah(balance)}</strong></div></section>
    <div className="finance-grid"><section className="panel"><div className="panel-head"><div><h2>Rekening penerimaan manual</h2><p className="muted">Jika aktif, pembeli mentransfer langsung ke rekening ini dan Anda meninjau buktinya.</p></div><BadgeDollarSign size={20} /></div><form className="form panel-form" action={updateManualPaymentAccountAction}><div className="field"><label htmlFor="manualBankName">Nama bank</label><input className="input" id="manualBankName" name="bankName" defaultValue={manualAccount?.bankName ?? ""} required maxLength={80} placeholder="Contoh: BCA" /></div><div className="field"><label htmlFor="manualAccountNumber">Nomor rekening</label><input className="input" id="manualAccountNumber" name="accountNumber" defaultValue={manualAccount?.accountNumber ?? ""} required inputMode="numeric" pattern="[0-9]{6,30}" maxLength={30} /></div><div className="field"><label htmlFor="manualAccountHolder">Nama pemilik rekening</label><input className="input" id="manualAccountHolder" name="accountHolder" defaultValue={manualAccount?.accountHolder ?? ""} required maxLength={100} /></div><label className="check-field"><input name="isActive" type="checkbox" defaultChecked={manualAccount?.isActive ?? false} /><span>Aktifkan transfer langsung<small>Pesanan baru akan menyimpan snapshot rekening ini. Pesanan lama tidak berubah.</small></span></label><button className="btn btn-primary" type="submit">Simpan rekening penerimaan</button></form></section><section className="panel"><div className="panel-head"><div><h2>Rekening pencairan</h2><p className="muted">Untuk saldo dari pembayaran yang diterima platform.</p></div><Landmark size={20} /></div><form className="form panel-form" action={updatePayoutAccountAction}><div className="field"><label htmlFor="bankName">Nama bank</label><input className="input" id="bankName" name="bankName" defaultValue={account?.bankName ?? ""} required maxLength={80} placeholder="Contoh: BCA" /></div><div className="field"><label htmlFor="accountNumber">Nomor rekening</label><input className="input" id="accountNumber" name="accountNumber" defaultValue={account?.accountNumber ?? ""} required inputMode="numeric" pattern="[0-9]{6,30}" maxLength={30} /></div><div className="field"><label htmlFor="accountHolder">Nama pemilik rekening</label><input className="input" id="accountHolder" name="accountHolder" defaultValue={account?.accountHolder ?? ""} required maxLength={100} /></div><button className="btn btn-primary" type="submit">Simpan rekening pencairan</button></form></section>
      <section className="panel"><div className="panel-head"><div><h2>Ajukan pencairan</h2><p className="muted">Minimum {formatRupiah(minimum)}. Admin tetap melakukan transfer dan verifikasi secara manual.</p></div><WalletCards size={20} /></div><form className="form panel-form" action={requestPayoutAction}><div className="balance-callout"><small>SALDO YANG DAPAT DICAIRKAN</small><strong>{formatRupiah(balance)}</strong></div><div className="field"><label htmlFor="amount">Nominal payout</label><input className="input" id="amount" name="amount" type="number" min={minimum} max={Math.max(balance, minimum)} step="1" required disabled={!canRequest} /></div><div className="field"><label htmlFor="note">Catatan (opsional)</label><textarea className="input" id="note" name="note" rows={3} maxLength={300} disabled={!canRequest} /></div><button className="btn btn-lime" type="submit" disabled={!canRequest}>Ajukan payout</button>{!account && <small className="field-hint">Simpan rekening pencairan terlebih dahulu.</small>}{account && balance < minimum && <small className="field-hint">Saldo belum mencapai minimum payout.</small>}</form></section></div>
    <section className="panel"><div className="panel-head"><h2>Riwayat payout</h2><span className="muted">{payouts.length} permintaan</span></div>{payouts.length ? payouts.map((payout) => <div className="finance-row" key={payout.id}><div><strong>{formatRupiah(payout.amount)}</strong><small>{payout.bankName} · {payout.accountNumber} · {formatDate(payout.createdAt)}</small>{payout.adminNote && <small>Catatan admin: {payout.adminNote}</small>}</div><div>{payout.transferReference && <small>Ref: {payout.transferReference}</small>}<span className={`badge status-${payout.status.toLowerCase()}`}>{payoutLabels[payout.status]}</span></div></div>) : <div className="empty"><p>Belum ada permintaan pencairan.</p></div>}</section>
    <section className="panel"><div className="panel-head"><h2>Ledger saldo</h2><span className="muted">40 mutasi terakhir</span></div>{ledger.length ? ledger.map((entry) => <div className="finance-row" key={entry.id}><div><strong>{ledgerLabels[entry.type]}</strong><small>{entry.description} · {formatDate(entry.createdAt)}</small></div><strong className={entry.amount > 0 ? "amount-positive" : "amount-negative"}>{entry.amount > 0 ? "+" : "−"}{formatRupiah(Math.abs(entry.amount))}</strong></div>) : <div className="empty"><p>Ledger masih kosong. Saldo akan muncul setelah transaksi pertama lunas.</p></div>}</section>
  </div></main>;
}
