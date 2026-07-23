import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { affiliateCommissions, affiliatePartners, affiliatePrograms, products } from "@/lib/schema";

export default async function MemberAffiliatesPage() {
  const user = await requireUser();
  const rows = await db.select({ partner: affiliatePartners, program: affiliatePrograms, product: products })
    .from(affiliatePartners).innerJoin(affiliatePrograms, eq(affiliatePrograms.id, affiliatePartners.programId))
    .innerJoin(products, eq(products.id, affiliatePrograms.productId))
    .where(eq(affiliatePartners.userId, user.id)).orderBy(desc(affiliatePartners.createdAt));
  const commissions = await db.select({ commission: affiliateCommissions, partnerId: affiliatePartners.id })
    .from(affiliateCommissions).innerJoin(affiliatePartners, eq(affiliatePartners.id, affiliateCommissions.partnerId))
    .where(eq(affiliatePartners.userId, user.id));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Penghasilan tambahan</span><h1 className="display">Affiliate saya</h1><p>Bagikan tautan Anda. Komisi tercatat otomatis saat pembeli menyelesaikan pembayaran.</p></div></div>
    <section className="panel">{rows.length ? rows.map(({ partner, program, product }) => { const own = commissions.filter((row) => row.partnerId === partner.id); return <div className="finance-row" key={partner.id}><div><strong>{product.name}</strong><small>Komisi {program.commissionBps / 100}% · {own.length} penjualan</small><code>{`${process.env.APP_URL ?? "https://rizqhub.id"}/p/${product.slug}?ref=${partner.code}`}</code></div><div><strong>{formatRupiah(own.reduce((sum, row) => sum + row.commission.amount, 0))}</strong><small>Total komisi</small></div></div>; }) : <div className="empty"><p>Belum ada program affiliate untuk akun Anda.</p></div>}</section>
  </div></main>;
}
