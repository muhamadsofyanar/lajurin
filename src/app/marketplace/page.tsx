/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { BadgeCheck, Star } from "lucide-react";
import { Nav } from "@/components/nav";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { merchantProfiles, productLandingPages, productReviews, products } from "@/lib/schema";

export const metadata = { title: "Marketplace — Temukan Produk di Rizqhub", description: "Temukan kursus, produk digital, konsultasi, dan jasa dari merchant aktif di Rizqhub." };
type Search = { q?: string; type?: "COURSE" | "DIGITAL" | "SERVICE"; sort?: "latest" | "rating" | "price_low" | "price_high"; verified?: string };

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Search> }) {
  const { q, type, sort = "latest", verified } = await searchParams;
  const raw = await db.select({ product: products, merchant: merchantProfiles, landing: productLandingPages }).from(products)
    .innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .leftJoin(productLandingPages, eq(productLandingPages.productId, products.id))
    .where(and(
      eq(products.status, "PUBLISHED"), eq(merchantProfiles.status, "ACTIVE"),
      q ? or(ilike(products.name, `%${q.slice(0, 80)}%`), ilike(products.headline, `%${q.slice(0, 80)}%`), ilike(merchantProfiles.brandName, `%${q.slice(0, 80)}%`)) : undefined,
      type ? eq(products.type, type) : undefined,
      verified === "1" ? eq(merchantProfiles.isVerified, true) : undefined,
    )).orderBy(desc(products.isFeatured), desc(products.updatedAt)).limit(100);
  const reviewRows = raw.length ? await db.select({ productId: productReviews.productId, rating: productReviews.rating }).from(productReviews)
    .where(and(inArray(productReviews.productId, raw.map((row) => row.product.id)), eq(productReviews.status, "PUBLISHED"))) : [];
  const stats = new Map<string, { count: number; average: number }>();
  for (const row of raw) {
    const values = reviewRows.filter((review) => review.productId === row.product.id);
    stats.set(row.product.id, { count: values.length, average: values.length ? values.reduce((sum, review) => sum + review.rating, 0) / values.length : 0 });
  }
  const rows = [...raw].sort((a, b) => {
    if (a.product.isFeatured !== b.product.isFeatured) return a.product.isFeatured ? -1 : 1;
    if (sort === "rating") return (stats.get(b.product.id)?.average ?? 0) - (stats.get(a.product.id)?.average ?? 0);
    if (sort === "price_low") return a.product.price - b.product.price;
    if (sort === "price_high") return b.product.price - a.product.price;
    return b.product.updatedAt.getTime() - a.product.updatedAt.getTime();
  }).slice(0, 60);
  return <><Nav /><main className="marketplace-page"><section className="marketplace-hero"><div className="shell"><span className="eyebrow">Marketplace Rizqhub</span><h1 className="display">Temukan produk dan keahlian yang membantu Anda maju.</h1><p>Kursus, file digital, konsultasi, dan jasa dari merchant aktif dalam satu katalog tepercaya.</p><form className="marketplace-search marketplace-search-advanced"><input className="input" name="q" defaultValue={q ?? ""} placeholder="Cari produk, layanan, atau merchant…" /><select className="input" name="type" defaultValue={type ?? ""}><option value="">Semua kategori</option><option value="COURSE">Kursus</option><option value="DIGITAL">Produk digital</option><option value="SERVICE">Jasa</option></select><select className="input" name="sort" defaultValue={sort}><option value="latest">Terbaru</option><option value="rating">Rating tertinggi</option><option value="price_low">Harga terendah</option><option value="price_high">Harga tertinggi</option></select><label className="marketplace-verified-filter"><input type="checkbox" name="verified" value="1" defaultChecked={verified === "1"} /> Terverifikasi</label><button className="btn btn-primary">Terapkan</button></form></div></section><section className="section"><div className="shell"><div className="marketplace-result-head"><h2>{rows.length} penawaran ditemukan</h2><span>Ulasan hanya dari pembeli dengan transaksi lunas.</span></div><div className="marketplace-grid">{rows.map(({ product, merchant, landing }) => { const rating = stats.get(product.id)!; return <Link className={`marketplace-card ${product.isFeatured ? "marketplace-card-featured" : ""}`} href={`/p/${product.slug}`} key={product.id}>{product.isFeatured && <span className="marketplace-featured-label">Pilihan Rizqhub</span>}{landing?.coverImageUrl ? <img src={landing.coverImageUrl} alt="" /> : <div className="marketplace-cover-placeholder"><span>{product.type === "COURSE" ? "KURSUS" : product.type === "DIGITAL" ? "DIGITAL" : "JASA"}</span></div>}<div><span className="badge">{product.type === "COURSE" ? "Kursus" : product.type === "DIGITAL" ? "Produk digital" : "Jasa"}</span><h2>{product.name}</h2><p>{product.headline}</p><small className="marketplace-merchant">{merchant.brandName}{merchant.isVerified && <BadgeCheck size={15} aria-label="Merchant terverifikasi" />}</small><span className="marketplace-rating"><Star size={15} fill="currentColor" /> {rating.count ? `${rating.average.toFixed(1)} (${rating.count})` : "Belum ada ulasan"}</span><strong>{formatRupiah(product.price)}</strong></div></Link>; })}</div>{!rows.length && <div className="empty"><p>Belum ada produk yang sesuai. Coba kata kunci atau kategori lain.</p></div>}</div></section></main></>;
}
