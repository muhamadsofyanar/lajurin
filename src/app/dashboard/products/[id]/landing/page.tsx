import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { ExternalLink, ImageUp } from "lucide-react";
import { notFound } from "next/navigation";
import { uploadLandingMediaAction } from "@/app/actions/merchant";
import { VisualLandingBuilder } from "@/components/visual-landing-builder";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { productLandingPages, products } from "@/lib/schema";

const defaultOrder = ["AUDIENCE", "INSTRUCTOR", "CURRICULUM", "BONUSES", "TESTIMONIALS", "OFFER", "FAQ"];

function localDateTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default async function LandingPageEditor({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const merchant = await requireMerchant("manage");
  await requireFeature("LANDING_PAGE_BUILDER", merchant.id);
  const { id } = await params;
  const { error, success } = await searchParams;
  const [row] = await db.select({ product: products, landing: productLandingPages }).from(products)
    .leftJoin(productLandingPages, eq(productLandingPages.productId, products.id))
    .where(and(eq(products.id, id), eq(products.merchantId, merchant.id))).limit(1);
  if (!row) notFound();
  const { product, landing } = row;
  const published = landing ? {
    eyebrow: landing.eyebrow, heroTitle: landing.heroTitle, heroSubtitle: landing.heroSubtitle,
    coverImageUrl: landing.coverImageUrl, heroVideoUrl: landing.heroVideoUrl, benefitsText: landing.benefitsText,
    audienceText: landing.audienceText, ctaText: landing.ctaText, accentColor: landing.accentColor, template: landing.template,
    instructorName: landing.instructorName, instructorRole: landing.instructorRole, instructorBio: landing.instructorBio,
    instructorImageUrl: landing.instructorImageUrl, bonusesText: landing.bonusesText, testimonialsText: landing.testimonialsText,
    faqText: landing.faqText, guaranteeTitle: landing.guaranteeTitle, guaranteeText: landing.guaranteeText,
    compareAtPrice: landing.compareAtPrice, promoEndsAt: localDateTime(landing.promoEndsAt),
    facebookPixelId: landing.facebookPixelId, tiktokPixelId: landing.tiktokPixelId,
  } : {};
  const draft = landing?.draftData && typeof landing.draftData === "object" ? landing.draftData : {};
  const merged = { ...published, ...draft, promoEndsAt: localDateTime(draft.promoEndsAt ?? published.promoEndsAt) } as Record<string, string | number | null>;
  const sectionOrder = Array.isArray(draft.sectionOrder)
    ? draft.sectionOrder.filter((item): item is string => typeof item === "string")
    : Array.isArray(landing?.sectionOrder) ? landing.sectionOrder : defaultOrder;

  return <main className="app-main"><div className="shell builder-shell"><div className="page-head"><div><span className="eyebrow">Landing Page Builder visual</span><h1 className="display" style={{ marginTop: 12 }}>{product.name}</h1><p>Susun section, lihat perubahan desktop/mobile, simpan draft, lalu publish saat siap.</p></div><div className="actions"><Link className="btn" href={`/dashboard/products/${product.id}`}>Kembali</Link><Link className="btn" href={`/dashboard/products/${product.id}/funnel`}>Kupon & funnel</Link><Link className="btn btn-primary" href={`/p/${product.slug}`} target="_blank">Versi publik <ExternalLink size={15} /></Link></div></div>{error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}
    <section className="panel form-panel builder-media-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Media landing page</h2><ImageUp size={20} /></div><div className="media-upload-grid"><form className="form media-upload-card" action={uploadLandingMediaAction.bind(null, product.id, "cover")}><strong>Gambar hero/cover</strong><p className="muted">Landscape 16:9, JPG/PNG/WebP maksimal 5 MB.</p><input className="input file-input" name="file" type="file" accept="image/jpeg,image/png,image/webp" required /><button className="btn" type="submit">Unggah cover</button></form><form className="form media-upload-card" action={uploadLandingMediaAction.bind(null, product.id, "instructor")}><strong>Foto pengajar</strong><p className="muted">Foto persegi atau portrait, maksimal 5 MB.</p><input className="input file-input" name="file" type="file" accept="image/jpeg,image/png,image/webp" required /><button className="btn" type="submit">Unggah foto</button></form></div></section>
    <VisualLandingBuilder product={{ id: product.id, name: product.name, slug: product.slug, headline: product.headline, description: product.description, price: product.price }} initial={merged} initialOrder={sectionOrder} />
  </div></main>;
}
