import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Nav } from "@/components/nav";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { courses, lessons, products, users } from "@/lib/schema";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [product] = await db.select({ name: products.name, description: products.description }).from(products).where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"))).limit(1);
  return product ? { title: product.name, description: product.description } : {};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [row] = await db.select({ product: products, merchantName: users.name, courseId: courses.id }).from(products).innerJoin(users, eq(products.merchantId, users.id)).innerJoin(courses, eq(courses.productId, products.id)).where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"))).limit(1);
  if (!row) notFound();
  const courseLessons = await db.select({ id: lessons.id, title: lessons.title, position: lessons.position }).from(lessons).where(eq(lessons.courseId, row.courseId)).orderBy(asc(lessons.position));
  const product = row.product;
  return <><Nav /><main className="store-hero"><div className="shell store-grid"><section><span className="eyebrow">Kursus digital · oleh {row.merchantName}</span><h1 className="display">{product.headline}</h1><p className="lead">{product.description}</p><div className="trust-row" style={{justifyContent:"flex-start"}}><span><CheckCircle2 size={15} style={{display:"inline",verticalAlign:"middle"}} /> Akses setelah pembayaran</span><span><CheckCircle2 size={15} style={{display:"inline",verticalAlign:"middle"}} /> Komunitas member</span></div><div className="course-list"><h2 style={{marginTop:32}}>Yang akan dipelajari</h2>{courseLessons.map((lesson) => <div className="course-item" key={lesson.id}><span className="course-number">{lesson.position}</span><div><strong>{lesson.title}</strong><p className="muted" style={{margin:"5px 0 0",fontSize:13}}>Materi tersedia setelah pembayaran.</p></div></div>)}</div></section><aside className="checkout-card"><span className="badge badge-live">Akses penuh</span><div className="price">{formatRupiah(product.price)}</div><p className="muted" style={{lineHeight:1.65}}>Sekali bayar untuk seluruh materi yang tersedia.</p><Link className="btn btn-primary" href={`/checkout/${product.slug}`} style={{width:"100%",marginTop:12}}>Dapatkan akses <ArrowRight size={17} /></Link><p className="muted" style={{textAlign:"center",fontSize:11,marginBottom:0}}>Bayar via Xendit atau transfer bank manual.</p></aside></div></main></>;
}
