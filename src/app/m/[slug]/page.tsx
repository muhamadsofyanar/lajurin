/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { ArrowRight, Mail, MessageCircle, Store } from "lucide-react";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { merchantProfiles, products } from "@/lib/schema";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [profile] = await db.select({ brandName: merchantProfiles.brandName, headline: merchantProfiles.headline }).from(merchantProfiles).where(eq(merchantProfiles.slug, slug)).limit(1);
  return profile ? { title: profile.brandName, description: profile.headline ?? `Produk digital dari ${profile.brandName}` } : {};
}

export default async function MerchantStorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [profile] = await db.select().from(merchantProfiles).where(eq(merchantProfiles.slug, slug)).limit(1);
  if (!profile) notFound();
  const productRows = await db.select().from(products).where(and(eq(products.merchantId, profile.userId), eq(products.status, "PUBLISHED"))).orderBy(desc(products.createdAt));
  const style = { "--merchant-accent": profile.accentColor } as CSSProperties;
  return <><Nav /><main className="merchant-store" style={style}><section className="merchant-hero"><div className="shell merchant-hero-inner"><span className="profile-logo large">{profile.logoUrl ? <img src={profile.logoUrl} alt={`Logo ${profile.brandName}`} /> : <Store size={34} />}</span><div><span className="eyebrow">Merchant Lajurin</span><h1 className="display">{profile.brandName}</h1><p>{profile.headline || profile.bio || "Kursus dan produk digital pilihan."}</p><div className="actions merchant-contact">{profile.supportEmail && <a className="btn" href={`mailto:${profile.supportEmail}`}><Mail size={15} /> Email</a>}{profile.whatsapp && <a className="btn" href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}</div></div></div></section><section className="section"><div className="shell"><div className="section-head"><span className="eyebrow">Etalase merchant</span><h2 className="display">Produk dari {profile.brandName}</h2>{profile.bio && <p>{profile.bio}</p>}</div>{productRows.length ? <div className="store-product-grid">{productRows.map((product) => <article className="store-product-card" key={product.id}><span className="badge badge-live">Kursus digital</span><h3 className="display">{product.name}</h3><p>{product.description}</p><strong>{formatRupiah(product.price)}</strong><Link className="btn btn-primary" href={`/p/${product.slug}`}>Lihat produk <ArrowRight size={15} /></Link></article>)}</div> : <section className="panel empty"><p>Merchant belum menerbitkan produk.</p></section>}</div></section></main></>;
}
