import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { addLessonAction, togglePublishAction, updateProductAction } from "@/app/actions/product";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, lessons, products } from "@/lib/schema";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const merchant = await requireMerchant();
  const { id } = await params;
  const { error } = await searchParams;
  const [row] = await db.select({ product: products, course: courses }).from(products).innerJoin(courses, eq(courses.productId, products.id)).where(and(eq(products.id, id), eq(products.merchantId, merchant.id))).limit(1);
  if (!row) notFound();
  const product = row.product;
  const courseLessons = await db.select().from(lessons).where(eq(lessons.courseId, row.course.id)).orderBy(asc(lessons.position));
  const updateAction = updateProductAction.bind(null, product.id);
  const lessonAction = addLessonAction.bind(null, product.id);
  const publishAction = togglePublishAction.bind(null, product.id);

  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">{product.name}</h1><p>/p/{product.slug}</p></div><div className="actions">{product.status === "PUBLISHED" && <Link className="btn" href={`/p/${product.slug}`} target="_blank">Lihat halaman <ExternalLink size={15} /></Link>}<form action={publishAction}><button className={`btn ${product.status === "PUBLISHED" ? "btn-danger" : "btn-lime"}`} type="submit">{product.status === "PUBLISHED" ? "Jadikan draf" : "Terbitkan"}</button></form></div></div>{error && <p className="alert" style={{marginBottom:18}}>{error}</p>}<div className="two-col"><div className="stack"><section className="panel form-panel"><div className="panel-head" style={{margin:-24,marginBottom:24}}><h2>Informasi produk</h2></div><form className="form" action={updateAction}><div className="field"><label htmlFor="name">Nama</label><input className="input" id="name" name="name" defaultValue={product.name} required /></div><div className="field"><label htmlFor="headline">Headline</label><input className="input" id="headline" name="headline" defaultValue={product.headline} required /></div><div className="field"><label htmlFor="description">Deskripsi</label><textarea className="input" id="description" name="description" defaultValue={product.description} required /></div><div className="field"><label htmlFor="price">Harga</label><input className="input" id="price" name="price" type="number" defaultValue={product.price} min={10000} step={1000} required /></div><button className="btn btn-primary" type="submit">Simpan perubahan</button></form></section><section className="panel form-panel"><div className="panel-head" style={{margin:-24,marginBottom:24}}><h2>Tambah materi</h2></div><form className="form" action={lessonAction}><div className="field"><label htmlFor="title">Judul materi</label><input className="input" id="title" name="title" required minLength={3} /></div><div className="field"><label htmlFor="videoUrl">URL video (opsional)</label><input className="input" id="videoUrl" name="videoUrl" type="url" placeholder="https://..." /></div><div className="field"><label htmlFor="content">Isi materi</label><textarea className="input" id="content" name="content" required minLength={10} /></div><button className="btn" type="submit">Tambahkan materi</button></form></section></div><aside className="panel form-panel"><div className="panel-head" style={{margin:-24,marginBottom:24}}><h2>Materi kursus</h2><span className="badge">{courseLessons.length}</span></div><div className="stack">{courseLessons.length ? courseLessons.map((lesson) => <article className="lesson" key={lesson.id}><small>MATERI {lesson.position}</small><h3>{lesson.title}</h3><p>{lesson.content.slice(0,120)}{lesson.content.length > 120 ? "…" : ""}</p></article>) : <p className="muted">Belum ada materi. Tambahkan minimal satu materi sebelum diterbitkan.</p>}</div></aside></div></div></main>;
}
