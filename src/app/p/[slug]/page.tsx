/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Award, CheckCircle2, Clock3, Gift, PlayCircle, ShieldCheck, Star, Store, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ConversionTracker } from "@/components/conversion-tracker";
import { Nav } from "@/components/nav";
import { VideoPlayer } from "@/components/video-player";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { courseModules, courses, lessons, merchantProfiles, productLandingPages, products, users } from "@/lib/schema";

type ProductSearch = { utm_source?: string; utm_medium?: string; utm_campaign?: string };

function lines(value: string | null | undefined) {
  return value?.split("\n").map((item) => item.trim()).filter(Boolean) ?? [];
}

function fields(value: string | null | undefined, count: number) {
  return lines(value).map((item) => item.split("|").map((part) => part.trim())).filter((parts) => parts.length >= count);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [row] = await db.select({ name: products.name, description: products.description, heroTitle: productLandingPages.heroTitle, heroSubtitle: productLandingPages.heroSubtitle, cover: productLandingPages.coverImageUrl }).from(products)
    .innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId)).leftJoin(productLandingPages, eq(productLandingPages.productId, products.id))
    .where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"), eq(merchantProfiles.status, "ACTIVE"))).limit(1);
  return row ? { title: row.heroTitle || row.name, description: row.heroSubtitle || row.description, openGraph: row.cover ? { images: [row.cover] } : undefined } : {};
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<ProductSearch> }) {
  const { slug } = await params;
  const search = await searchParams;
  const [row] = await db.select({ product: products, merchantName: users.name, courseId: courses.id, merchantProfile: merchantProfiles, landing: productLandingPages }).from(products)
    .innerJoin(users, eq(products.merchantId, users.id)).innerJoin(courses, eq(courses.productId, products.id)).innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId)).leftJoin(productLandingPages, eq(productLandingPages.productId, products.id))
    .where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"), eq(merchantProfiles.status, "ACTIVE"))).limit(1);
  if (!row) notFound();

  const modules = await db.select({ id: courseModules.id, title: courseModules.title, position: courseModules.position }).from(courseModules).where(eq(courseModules.courseId, row.courseId)).orderBy(asc(courseModules.position));
  const courseLessons = await db.select({ id: lessons.id, title: lessons.title, position: lessons.position, isPreview: lessons.isPreview, moduleId: lessons.moduleId }).from(lessons).where(eq(lessons.courseId, row.courseId)).orderBy(asc(lessons.position));
  const grouped = modules.map((module) => ({ module, lessons: courseLessons.filter((lesson) => lesson.moduleId === module.id) }));
  const ungrouped = courseLessons.filter((lesson) => !lesson.moduleId || !modules.some((module) => module.id === lesson.moduleId));
  const { product, landing } = row;
  const merchantBrand = row.merchantProfile.brandName ?? row.merchantName;
  const benefits = lines(landing?.benefitsText);
  const bonuses = fields(landing?.bonusesText, 1);
  const testimonials = fields(landing?.testimonialsText, 3);
  const faqs = fields(landing?.faqText, 2);
  const accentColor = landing?.accentColor ?? row.merchantProfile.accentColor ?? "#0f9f91";
  const configuredOrder = Array.isArray(landing?.sectionOrder) ? landing.sectionOrder : ["AUDIENCE", "INSTRUCTOR", "CURRICULUM", "BONUSES", "TESTIMONIALS", "OFFER", "FAQ"];
  const sectionPosition = (key: string) => 10 + Math.max(0, configuredOrder.indexOf(key));
  const sectionStyles = `.audience-section{order:${sectionPosition("AUDIENCE")}}.sales-page>.sales-section:has(.instructor-grid){order:${sectionPosition("INSTRUCTOR")}}.curriculum-section{order:${sectionPosition("CURRICULUM")}}.bonus-section{order:${sectionPosition("BONUSES")}}.testimonial-section{order:${sectionPosition("TESTIMONIALS")}}.final-offer{order:${sectionPosition("OFFER")}}.faq-section{order:${sectionPosition("FAQ")}}`;
  const pageStyle = { "--landing-accent": accentColor, display: "flex", flexDirection: "column" } as CSSProperties;
  const template = landing?.template?.toLowerCase() ?? "editorial";
  const promoActive = Boolean(landing?.promoEndsAt && landing.promoEndsAt > new Date());
  const query = new URLSearchParams();
  if (search.utm_source) query.set("utm_source", search.utm_source);
  if (search.utm_medium) query.set("utm_medium", search.utm_medium);
  if (search.utm_campaign) query.set("utm_campaign", search.utm_campaign);
  const checkoutHref = `/checkout/${product.slug}${query.size ? `?${query.toString()}` : ""}`;
  const isCourse = product.type === "COURSE";
  const typeName = isCourse ? "Kursus digital" : product.type === "DIGITAL" ? "Produk digital" : "Jasa profesional";
  const defaultCta = isCourse ? "Mulai belajar" : product.type === "DIGITAL" ? "Dapatkan produk" : "Pesan layanan";
  const lessonRow = (lesson: typeof courseLessons[number]) => <div className="course-item" key={lesson.id}><span className="course-number">{lesson.position}</span><div><strong>{lesson.title}</strong>{lesson.isPreview ? <p><Link className="preview-link" href={`/p/${product.slug}/preview/${lesson.id}`}><PlayCircle size={15} /> Preview gratis</Link></p> : <p className="muted">Tersedia setelah pembayaran</p>}</div></div>;

  return <><Nav /><ConversionTracker productId={product.id} utmSource={search.utm_source} utmMedium={search.utm_medium} utmCampaign={search.utm_campaign} facebookPixelId={landing?.facebookPixelId} tiktokPixelId={landing?.tiktokPixelId} />
    <main className={`sales-page template-${template}`} style={pageStyle}><style>{sectionStyles}</style>
      <section className="sales-hero"><div className="shell sales-hero-grid"><div className="sales-copy"><span className="sales-eyebrow"><Users size={16} /> {landing?.eyebrow || typeName}</span><h1 className="display">{landing?.heroTitle || product.headline}</h1><p className="sales-lead">{landing?.heroSubtitle || product.description}</p>
        {benefits.length > 0 && <div className="sales-benefits">{benefits.slice(0, 3).map((benefit) => <span key={benefit}><CheckCircle2 size={18} /> {benefit}</span>)}</div>}
        <Link className="sales-merchant" href={`/m/${row.merchantProfile.slug}`}><span className="profile-logo small">{row.merchantProfile.logoUrl ? <img src={row.merchantProfile.logoUrl} alt="" /> : <Store size={18} />}</span><strong>{merchantBrand}</strong></Link>
        <div className="sales-price">{landing?.compareAtPrice && landing.compareAtPrice > product.price && <del>{formatRupiah(landing.compareAtPrice)}</del>}<strong>{formatRupiah(product.price)}</strong>{promoActive && <span><Clock3 size={14} /> Promo sampai {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(landing!.promoEndsAt!)}</span>}</div>
        <Link className="btn sales-primary-cta" href={checkoutHref}>{landing?.ctaText || defaultCta} <ArrowRight size={19} /></Link><p className="sales-safe"><ShieldCheck size={15} /> Pembayaran aman · pesanan tercatat di akun</p>
      </div><div className="sales-media">{landing?.heroVideoUrl ? <VideoPlayer url={landing.heroVideoUrl} title={product.name} /> : landing?.coverImageUrl ? <img src={landing.coverImageUrl} alt={`Sampul ${product.name}`} /> : <div className="sales-media-placeholder"><PlayCircle size={54} /><strong>{product.name}</strong><span>Tambahkan cover atau video melalui editor landing page.</span></div>}<div className="floating-proof rating"><Star size={19} fill="currentColor" /><span><strong>{isCourse ? "Materi terstruktur" : product.type === "DIGITAL" ? "Akses privat" : "Proses terpantau"}</strong><small>{isCourse ? `${courseLessons.length} materi siap dipelajari` : product.type === "DIGITAL" ? "Unduh setelah pembayaran" : "Portal khusus pelanggan"}</small></span></div><div className="floating-proof access"><Award size={19} /><span><strong>Akun pelanggan</strong><small>Riwayat dan akses tersimpan</small></span></div></div></div></section>

      <section className="shell proof-strip"><div><ShieldCheck /><span><strong>Pembayaran tercatat</strong><small>Riwayat tersimpan di akun</small></span></div><div><PlayCircle /><span><strong>{isCourse ? `${courseLessons.length} materi` : product.type === "DIGITAL" ? "File privat" : "Portal layanan"}</strong><small>{isCourse ? "Belajar sesuai ritme Anda" : product.type === "DIGITAL" ? "Khusus pembeli lunas" : "Pantau proses dan dokumen"}</small></span></div><div><Users /><span><strong>Dukungan merchant</strong><small>Terhubung melalui akun</small></span></div></section>

      {landing?.audienceText && <section className="sales-section audience-section"><div className="shell narrow"><span className="section-kicker">COCOK UNTUK SIAPA</span><h2 className="display">Kelas ini dirancang untuk Anda yang ingin maju dengan arah yang jelas.</h2><p>{landing.audienceText}</p></div></section>}

      {landing?.instructorName && <section className="sales-section"><div className="shell instructor-grid">{landing.instructorImageUrl ? <img className="instructor-photo" src={landing.instructorImageUrl} alt={landing.instructorName} /> : <div className="instructor-photo placeholder"><Users size={48} /></div>}<div><span className="section-kicker">PENGAJAR</span><h2 className="display">Belajar bersama {landing.instructorName}</h2>{landing.instructorRole && <strong className="instructor-role">{landing.instructorRole}</strong>}<p>{landing.instructorBio}</p></div></div></section>}

      {isCourse && <section className="sales-section curriculum-section"><div className="shell sales-two-col"><div><span className="section-kicker">KURIKULUM</span><h2 className="display">Yang akan Anda pelajari</h2><p>Materi tersusun agar mudah diikuti dan dapat ditinjau kembali melalui member area.</p></div><div className="course-list sales-curriculum">{grouped.filter((group) => group.lessons.length).map(({ module, lessons: moduleLessons }) => <section className="store-module" key={module.id}><div className="store-module-head"><small>BAB {module.position}</small><h3>{module.title}</h3></div>{moduleLessons.map(lessonRow)}</section>)}{ungrouped.length > 0 && <section className="store-module"><div className="store-module-head"><h3>Materi lainnya</h3></div>{ungrouped.map(lessonRow)}</section>}</div></div></section>}

      {bonuses.length > 0 && <section className="sales-section bonus-section"><div className="shell"><span className="section-kicker">BONUS</span><h2 className="display">Tambahan yang membantu Anda bergerak lebih cepat</h2><div className="bonus-grid">{bonuses.map(([name, description], index) => <article key={`${name}-${index}`}><Gift size={24} /><span>Bonus {index + 1}</span><h3>{name}</h3>{description && <p>{description}</p>}</article>)}</div></div></section>}

      {testimonials.length > 0 && <section className="sales-section testimonial-section"><div className="shell"><span className="section-kicker">TESTIMONI</span><h2 className="display">Pengalaman peserta</h2><div className="testimonial-grid">{testimonials.map(([name, role, quote], index) => <blockquote key={`${name}-${index}`}><div className="stars">★★★★★</div><p>“{quote}”</p><footer><strong>{name}</strong><span>{role}</span></footer></blockquote>)}</div></div></section>}

      <section className="sales-section final-offer"><div className="shell final-offer-grid"><div><span className="section-kicker">MULAI SEKARANG</span><h2 className="display">Ambil langkah berikutnya bersama {merchantBrand}.</h2>{landing?.guaranteeTitle && <div className="guarantee"><ShieldCheck size={28} /><div><strong>{landing.guaranteeTitle}</strong><p>{landing.guaranteeText}</p></div></div>}</div><aside className="final-price-card">{landing?.compareAtPrice && landing.compareAtPrice > product.price && <del>{formatRupiah(landing.compareAtPrice)}</del>}<strong>{formatRupiah(product.price)}</strong><p>Sekali bayar untuk produk utama.</p><Link className="btn btn-primary btn-large" href={checkoutHref}>{landing?.ctaText || defaultCta} <ArrowRight size={18} /></Link><small>Order bump, bila tersedia, bersifat opsional di checkout.</small></aside></div></section>

      {faqs.length > 0 && <section className="sales-section faq-section"><div className="shell narrow"><span className="section-kicker">FAQ</span><h2 className="display">Pertanyaan yang sering diajukan</h2><div className="faq-list">{faqs.map(([question, answer], index) => <details key={`${question}-${index}`}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></div></section>}
    </main></>;
}
