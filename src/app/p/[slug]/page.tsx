/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, PlayCircle, Store } from "lucide-react";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Nav } from "@/components/nav";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { courseModules, courses, lessons, merchantProfiles, productLandingPages, products, users } from "@/lib/schema";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [row] = await db.select({
    name: products.name,
    description: products.description,
    heroTitle: productLandingPages.heroTitle,
    heroSubtitle: productLandingPages.heroSubtitle,
  }).from(products).leftJoin(productLandingPages, eq(productLandingPages.productId, products.id))
    .where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"))).limit(1);
  return row ? { title: row.heroTitle || row.name, description: row.heroSubtitle || row.description } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [row] = await db.select({
    product: products,
    merchantName: users.name,
    courseId: courses.id,
    merchantProfile: merchantProfiles,
    landing: productLandingPages,
  }).from(products)
    .innerJoin(users, eq(products.merchantId, users.id))
    .innerJoin(courses, eq(courses.productId, products.id))
    .leftJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .leftJoin(productLandingPages, eq(productLandingPages.productId, products.id))
    .where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"))).limit(1);
  if (!row) notFound();

  const modules = await db.select({ id: courseModules.id, title: courseModules.title, position: courseModules.position }).from(courseModules).where(eq(courseModules.courseId, row.courseId)).orderBy(asc(courseModules.position));
  const courseLessons = await db.select({ id: lessons.id, title: lessons.title, position: lessons.position, isPreview: lessons.isPreview, moduleId: lessons.moduleId }).from(lessons).where(eq(lessons.courseId, row.courseId)).orderBy(asc(lessons.position));
  const grouped = modules.map((module) => ({ module, lessons: courseLessons.filter((lesson) => lesson.moduleId === module.id) }));
  const ungrouped = courseLessons.filter((lesson) => !lesson.moduleId || !modules.some((module) => module.id === lesson.moduleId));
  const product = row.product;
  const merchantBrand = row.merchantProfile?.brandName ?? row.merchantName;
  const benefits = row.landing?.benefitsText?.split("\n").map((item) => item.trim()).filter(Boolean) ?? [];
  const accentColor = row.landing?.accentColor ?? row.merchantProfile?.accentColor ?? "#163d2d";
  const pageStyle = { "--landing-accent": accentColor } as CSSProperties;
  const lessonRow = (lesson: typeof courseLessons[number]) => <div className="course-item" key={lesson.id}><span className="course-number">{lesson.position}</span><div><strong>{lesson.title}</strong>{lesson.isPreview ? <p style={{margin:"7px 0 0"}}><Link className="preview-link" href={`/p/${product.slug}/preview/${lesson.id}`}><PlayCircle size={15} /> Lihat preview gratis</Link></p> : <p className="muted" style={{margin:"5px 0 0",fontSize:13}}>Materi tersedia setelah pembayaran.</p>}</div></div>;

  return <><Nav /><main className="landing-page" style={pageStyle}><section className="store-hero"><div className="shell store-grid"><section>
    <span className="eyebrow">{row.landing?.eyebrow || "Kursus digital"} · oleh {merchantBrand}</span>
    <h1 className="display">{row.landing?.heroTitle || product.headline}</h1>
    <p className="lead">{row.landing?.heroSubtitle || product.description}</p>
    {benefits.length > 0 && <div className="landing-benefits">{benefits.map((benefit) => <span key={benefit}><CheckCircle2 size={17} /> {benefit}</span>)}</div>}
    <div className="trust-row" style={{justifyContent:"flex-start"}}><span><CheckCircle2 size={15} /> Akses setelah pembayaran</span><span><CheckCircle2 size={15} /> Komunitas member</span></div>
    {row.landing?.coverImageUrl && <img className="landing-cover" src={row.landing.coverImageUrl} alt={`Sampul ${product.name}`} />}
    {row.landing?.audienceText && <section className="landing-audience"><small>COCOK UNTUK SIAPA</small><h2 className="display">Apakah kelas ini untuk Anda?</h2><p>{row.landing.audienceText}</p></section>}
    <div className="course-list"><h2>Yang akan dipelajari</h2>{grouped.filter((group) => group.lessons.length).map(({ module, lessons: moduleLessons }) => <section className="store-module" key={module.id}><div className="store-module-head"><small>BAB {module.position}</small><h3>{module.title}</h3></div>{moduleLessons.map(lessonRow)}</section>)}{ungrouped.length > 0 && <section className="store-module"><div className="store-module-head"><h3>Materi lainnya</h3></div>{ungrouped.map(lessonRow)}</section>}</div>
  </section><aside className="checkout-card">{row.landing?.coverImageUrl && <img className="checkout-cover" src={row.landing.coverImageUrl} alt="" />}<span className="badge badge-live">Akses penuh</span><div className="price">{formatRupiah(product.price)}</div><p className="muted">Sekali bayar untuk seluruh materi yang tersedia.</p><Link className="btn btn-primary landing-cta" href={`/checkout/${product.slug}`}>{row.landing?.ctaText || "Dapatkan akses"} <ArrowRight size={17} /></Link><p className="muted checkout-note">Bayar via Xendit atau transfer bank manual. Konfirmasi transfer hanya dilakukan admin platform.</p>{row.merchantProfile && <Link className="merchant-mini" href={`/m/${row.merchantProfile.slug}`}><span className="profile-logo small">{row.merchantProfile.logoUrl ? <img src={row.merchantProfile.logoUrl} alt="" /> : <Store size={18} />}</span><span><small>DIJUAL OLEH</small><strong>{row.merchantProfile.brandName}</strong></span><ArrowRight size={15} /></Link>}</aside></div></section></main></>;
}
