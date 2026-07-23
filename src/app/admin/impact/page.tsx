import { and, eq, sql, type SQL } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { affiliateCommissions, affiliatePartners, merchantProfiles, orders, productReviews, products, productSubscriptions, serviceCases } from "@/lib/schema";

async function count(table: AnyPgTable, condition?: SQL) {
  const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(table).where(condition);
  return row?.value ?? 0;
}

export default async function AdminImpactPage() {
  await requireAdmin();
  const [
    activeMerchants, publishedProducts, paidOrders, buyers, gross, courseAccess,
    completedServices, activeSubscriptions, partners, commissions, reviews,
  ] = await Promise.all([
    count(merchantProfiles, eq(merchantProfiles.status, "ACTIVE")),
    count(products, eq(products.status, "PUBLISHED")),
    count(orders, eq(orders.status, "PAID")),
    db.select({ value: sql<number>`count(distinct ${orders.customerEmail})::int` }).from(orders).where(eq(orders.status, "PAID")).then((rows) => rows[0]?.value ?? 0),
    db.select({ value: sql<number>`coalesce(sum(${orders.amount}), 0)::bigint` }).from(orders).where(eq(orders.status, "PAID")).then((rows) => Number(rows[0]?.value ?? 0)),
    db.select({ value: sql<number>`count(*)::int` }).from(orders).innerJoin(products, eq(products.id, orders.productId)).where(and(eq(orders.status, "PAID"), eq(products.type, "COURSE"))).then((rows) => rows[0]?.value ?? 0),
    count(serviceCases, eq(serviceCases.status, "COMPLETED")),
    count(productSubscriptions, eq(productSubscriptions.status, "ACTIVE")),
    count(affiliatePartners),
    db.select({ value: sql<number>`coalesce(sum(${affiliateCommissions.amount}), 0)::bigint` }).from(affiliateCommissions).then((rows) => Number(rows[0]?.value ?? 0)),
    count(productReviews, eq(productReviews.status, "PUBLISHED")),
  ]);
  const indicators = [
    ["Merchant aktif", activeMerchants, "Usaha yang memiliki toko aktif di ekosistem"],
    ["Produk terbit", publishedProducts, "Produk, kelas, dan jasa yang dapat ditemukan"],
    ["Pembeli terlayani", buyers, "Pembeli unik dengan transaksi lunas"],
    ["Transaksi berhasil", paidOrders, "Pesanan yang telah dinyatakan lunas"],
    ["Akses pembelajaran", courseAccess, "Pembelian kelas yang membuka akses belajar"],
    ["Layanan selesai", completedServices, "Kasus jasa yang telah dituntaskan"],
    ["Langganan aktif", activeSubscriptions, "Hubungan layanan yang masih berjalan"],
    ["Mitra affiliate", partners, "Mitra yang ikut membuka jalan pemasaran"],
    ["Ulasan terbit", reviews, "Suara pelanggan yang lolos moderasi"],
  ] as const;
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Dampak operasional</span><h1 className="display">Dampak RizqHub</h1><p>Indikator faktual dari aktivitas platform. Angka ini tidak mengklaim dampak sosial di luar data yang benar-benar tercatat.</p></div></div>
    <section className="panel impact-total"><small>Nilai transaksi berhasil</small><strong>{formatRupiah(gross)}</strong><p>Komisi affiliate yang tercipta: {formatRupiah(commissions)}</p></section>
    <section className="trust-grid">{indicators.map(([label, value, description]) => <article className="panel" key={label}><span className="eyebrow">{label}</span><h2 className="display">{value}</h2><p>{description}</p></article>)}</section>
  </div></main>;
}
