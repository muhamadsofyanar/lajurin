import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, PlayCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Nav } from "@/components/nav";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { courseModules, courses, lessons, products, users } from "@/lib/schema";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [product] = await db.select({ name: products.name, description: products.description }).from(products).where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"))).limit(1);
  return product ? { title: product.name, description: product.description } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [row] = await db.select({ product: products, merchantName: users.name, courseId: courses.id }).from(products).innerJoin(users, eq(products.merchantId, users.id)).innerJoin(courses, eq(courses.productId, products.id)).where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"))).limit(1);
  if (!row) notFound();
  const modules = await db.select({ id: courseModules.id, title: courseModules.title, position: courseModules.position }).from(courseModules).where(eq(courseModules.courseId, row.courseId)).orderBy(asc(courseModules.position));
  const courseLessons = await db.select({ id: lessons.id, title: lessons.title, position: lessons.position, isPreview: lessons.isPreview }).from(lessons).where(eq(lessons.courseId, row.courseId)).orderBy(asc(lessons.position));
  const lessonsWithModules = await db.select({ id: lessons.id, moduleId: lessons.moduleId }).from(lessons).where(eq(lessons.courseId, row.courseId));
  const moduleByLesson = new Map(lessonsWithModules.map((lesson) => [lesson.id, lesson.moduleId]));
  const grouped = modules.map((module) => ({ module, lessons: courseLessons.filter((lesson) => moduleByLesson.get(lesson.id) === module.id) }));
  const ungrouped = courseLessons.filter((lesson) => !moduleByLesson.get(lesson.id) || !modules.some((module) => module.id === moduleByLesson.get(lesson.id)));
  const product = row.product;
  const lessonRow = (lesson: typeof courseLessons[number]) => <div className="course-item" key={lesson.id}><span className="course-number">{lesson.position}</span><div><strong>{lesson.title}</strong>{lesson.isPreview ? <p style={{margin:"7px 0 0"}}><Link className="preview-link" href={`/p/${product.slug}/preview/${lesson.id}`}><PlayCircle size={15} /> Lihat preview gratis</Link></p> : <p className="muted" style={{margin:"5px 0 0",fontSize:13}}>Materi tersedia setelah pembayaran.</p>}</div></div>;
  return <><Nav /><main className="store-hero"><div className="shell store-grid"><section><span className="eyebrow">Kursus digital · oleh {row.merchantName}</span><h1 className="display">{product.headline}</h1><p className="lead">{product.description}</p><div className="trust-row" style={{justifyContent:"flex-start"}}><span><CheckCircle2 size={15} style={{display:"inline",verticalAlign:"middle"}} /> Akses setelah pembayaran</span><span><CheckCircle2 size={15} style={{display:"inline",verticalAlign:"middle"}} /> Komunitas member</span></div><div className="course-list"><h2 style={{marginTop:32}}>Yang akan dipelajari</h2>{grouped.filter((group) => group.lessons.length).map(({ module, lessons: moduleLessons }) => <section className="store-module" key={module.id}><div className="store-module-head"><small>BAB {module.position}</small><h3>{module.title}</h3></div>{moduleLessons.map(lessonRow)}</section>)}{ungrouped.length > 0 && <section className="store-module"><div className="store-module-head"><h3>Materi lainnya</h3></div>{ungrouped.map(lessonRow)}</section>}</div></section><aside className="checkout-card"><span className="badge badge-live">Akses penuh</span><div className="price">{formatRupiah(product.price)}</div><p className="muted" style={{lineHeight:1.65}}>Sekali bayar untuk seluruh materi yang tersedia.</p><Link className="btn btn-primary" href={`/checkout/${product.slug}`} style={{width:"100%",marginTop:12}}>Dapatkan akses <ArrowRight size={17} /></Link><p className="muted" style={{textAlign:"center",fontSize:11,marginBottom:0}}>Bayar via Xendit atau transfer bank manual.</p></aside></div></main></>;
}
