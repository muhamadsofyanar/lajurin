import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { Nav } from "@/components/nav";
import { VideoPlayer } from "@/components/video-player";
import { db } from "@/lib/db";
import { courses, lessons, products } from "@/lib/schema";

export default async function PublicLessonPreviewPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const [row] = await db.select({ product: products, lesson: lessons }).from(products)
    .innerJoin(courses, eq(courses.productId, products.id))
    .innerJoin(lessons, eq(lessons.courseId, courses.id))
    .where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"), eq(lessons.id, lessonId), eq(lessons.isPreview, true))).limit(1);
  if (!row) notFound();

  return <><Nav /><main className="preview-page"><div className="shell preview-shell"><Link className="muted" href={`/p/${row.product.slug}`}>← Kembali ke halaman kelas</Link><div className="preview-heading"><span className="eyebrow">Preview gratis</span><h1 className="display">{row.lesson.title}</h1></div>{row.lesson.videoUrl && <VideoPlayer url={row.lesson.videoUrl} title={row.lesson.title} />}<div className="preview-copy">{row.lesson.content}</div><section className="preview-cta"><div><strong>Lanjutkan belajar di kelas lengkap</strong><p>Dapatkan seluruh materi dan akses komunitas member.</p></div><Link className="btn btn-primary" href={`/checkout/${row.product.slug}`}>Dapatkan akses <ArrowRight size={17} /></Link></section></div></main></>;
}
