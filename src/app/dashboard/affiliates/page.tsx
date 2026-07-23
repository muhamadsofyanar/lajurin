import { desc, eq } from "drizzle-orm";
import { addAffiliatePartnerAction, markAffiliateCommissionPaidAction, saveAffiliateProgramAction } from "@/app/actions/affiliate";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate } from "@/lib/order";
import { affiliateCommissions, affiliatePartners, affiliatePrograms, orders, products, users } from "@/lib/schema";

export default async function AffiliateDashboard({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const merchant = await requireMerchant();
  const query = await searchParams;
  const [productRows, partners, commissions] = await Promise.all([
    db.select({ product: products, program: affiliatePrograms }).from(products)
      .leftJoin(affiliatePrograms, eq(affiliatePrograms.productId, products.id))
      .where(eq(products.merchantId, merchant.id)).orderBy(products.name),
    db.select({ partner: affiliatePartners, program: affiliatePrograms, productName: products.name, user: users })
      .from(affiliatePartners).innerJoin(affiliatePrograms, eq(affiliatePrograms.id, affiliatePartners.programId))
      .innerJoin(products, eq(products.id, affiliatePrograms.productId)).innerJoin(users, eq(users.id, affiliatePartners.userId))
      .where(eq(products.merchantId, merchant.id)).orderBy(desc(affiliatePartners.createdAt)),
    db.select({ commission: affiliateCommissions, productName: products.name, partnerName: users.name, orderExternalId: orders.externalId })
      .from(affiliateCommissions).innerJoin(affiliatePartners, eq(affiliatePartners.id, affiliateCommissions.partnerId))
      .innerJoin(affiliatePrograms, eq(affiliatePrograms.id, affiliatePartners.programId))
      .innerJoin(products, eq(products.id, affiliatePrograms.productId)).innerJoin(users, eq(users.id, affiliatePartners.userId))
      .innerJoin(orders, eq(orders.id, affiliateCommissions.orderId))
      .where(eq(products.merchantId, merchant.id)).orderBy(desc(affiliateCommissions.createdAt)).limit(100),
  ]);
  const total = commissions.reduce((sum, row) => sum + row.commission.amount, 0);
  const pending = commissions.filter((row) => row.commission.status === "PENDING").reduce((sum, row) => sum + row.commission.amount, 0);
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Growth channel</span><h1 className="display">Affiliate</h1><p>Atur komisi per produk, berikan tautan unik, dan catat komisi otomatis saat order lunas.</p></div></div>
    {query.success && <p className="alert alert-success">{query.success}</p>}{query.error && <p className="alert">{query.error}</p>}
    <div className="stats stats-4"><article className="stat"><strong>{productRows.filter((row) => row.program?.isActive).length}</strong><span>Program aktif</span></article><article className="stat"><strong>{partners.length}</strong><span>Mitra</span></article><article className="stat"><strong>{formatRupiah(total)}</strong><span>Total komisi</span></article><article className="stat"><strong>{formatRupiah(pending)}</strong><span>Belum dibayar</span></article></div>
    <section className="panel"><div className="panel-head"><h2>Program per produk</h2></div>{productRows.map(({ product, program }) => <div className="finance-row" key={product.id}><div><strong>{product.name}</strong><small>{program ? `${program.commissionBps / 100}% · ${program.isActive ? "Aktif" : "Nonaktif"}` : "Belum diaktifkan"}</small></div><form className="actions" action={saveAffiliateProgramAction.bind(null, product.id)}><input className="input compact-input" name="commissionPercent" type="number" min="1" max="80" defaultValue={program?.commissionBps ? program.commissionBps / 100 : 20} aria-label="Persen komisi" /><label className="check-field compact"><input name="isActive" type="checkbox" defaultChecked={program?.isActive ?? true} /><span>Aktif</span></label><button className="btn" type="submit">Simpan</button></form></div>)}</section>
    <section className="panel"><div className="panel-head"><h2>Mitra affiliate</h2><span className="muted">Mitra harus memiliki akun Rizqhub</span></div>{productRows.filter((row) => row.program).map(({ product, program }) => <form className="finance-row" action={addAffiliatePartnerAction.bind(null, program!.id)} key={product.id}><div><strong>{product.name}</strong><small>Tambahkan mitra berdasarkan email akun.</small></div><div className="actions"><input className="input" name="email" type="email" required placeholder="email@mitra.com" /><button className="btn btn-primary" type="submit">Tambah mitra</button></div></form>)}{partners.map(({ partner, productName, user }) => <div className="finance-row" key={partner.id}><div><strong>{user.name} · {productName}</strong><small>{user.email}</small></div><code>{`${process.env.APP_URL ?? "https://rizqhub.id"}/r/${partner.code}`}</code></div>)}</section>
    <section className="panel"><div className="panel-head"><h2>Komisi penjualan</h2><span className="muted">100 terbaru</span></div>{commissions.length ? commissions.map(({ commission, productName, partnerName, orderExternalId }) => <div className="finance-row" key={commission.id}><div><strong>{partnerName} · {productName}</strong><small>{orderExternalId} · {formatDate(commission.createdAt)}</small></div><div className="actions"><strong>{formatRupiah(commission.amount)}</strong><span className={`badge status-${commission.status.toLowerCase()}`}>{commission.status === "PAID" ? "Dibayar" : "Menunggu"}</span>{commission.status === "PENDING" && <form action={markAffiliateCommissionPaidAction.bind(null, commission.id)}><button className="btn btn-compact" type="submit">Tandai dibayar</button></form>}</div></div>) : <div className="empty"><p>Komisi akan muncul otomatis setelah order dari tautan affiliate berstatus lunas.</p></div>}</section>
  </div></main>;
}
