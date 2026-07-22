import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { addLessonAction, deleteLessonAction, moveLessonAction, togglePublishAction, updateLessonAction, updateProductAction } from "@/app/actions/product";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, lessons, products } from "@/lib/schema";

export default async function EditProductPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const merchant = await requireMerchant();
  const { id } = await params;
  const { error } = await searchParams;
  const [row] = await db.select({ product: products, course: courses }).from(products)
    .innerJoin(courses, eq(courses.productId, products.id))
    .where(and(eq(products.id, id), eq(products.merchantId, merchant.id))).limit(1);
  if (!row) notFound();
  const { product } = row;
  const courseLessons = await db.select().from(lessons).where(eq(lessons.courseId, row.course.id)).orderBy(asc(lessons.position));

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><h1 className="display">{product.name}</h1><p>/p/{product.slug}</p></div><div className="actions">{product.status === "PUBLISHED" && <Link className="btn" href={`/p/${product.slug}`} target="_blank">Lihat halaman <ExternalLink size={15} /></Link>}<form action={togglePublishAction.bind(null, product.id)}><button className={`btn ${product.status === "PUBLISHED" ? "btn-danger" : "btn-lime"}`} type="submit">{product.status === "PUBLISHED" ? "Jadikan draf" : "Terbitkan"}</button></form></div></div>
    {error && <p className="alert" style={{ marginBottom: 18 }}>{error}</p>}
    <div className="two-col"><div className="stack">
      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Informasi produk</h2></div><form className="form" action={updateProductAction.bind(null, product.id)}>
        <div className="field"><label htmlFor="name">Nama</label><input className="input" id="name" name="name" defaultValue={product.name} required /></div>
        <div className="field"><label htmlFor="headline">Headline</label><input className="input" id="headline" name="headline" defaultValue={product.headline} required /></div>
        <div className="field"><label htmlFor="description">Deskripsi</label><textarea className="input" id="description" name="description" defaultValue={product.description} required /></div>
        <div className="field"><label htmlFor="price">Harga</label><input className="input" id="price" name="price" type="number" defaultValue={product.price} min={10000} step={1000} required /></div>
        <button className="btn btn-primary" type="submit">Simpan perubahan</button>
      </form></section>

      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Tambah materi</h2></div><form className="form" action={addLessonAction.bind(null, product.id)}>
        <div className="field"><label htmlFor="title">Judul materi</label><input className="input" id="title" name="title" required minLength={3} /></div>
        <div className="field"><label htmlFor="videoUrl">URL video (opsional)</label><input className="input" id="videoUrl" name="videoUrl" type="url" placeholder="YouTube, Vimeo, Loom, atau file MP4" /><small className="field-hint">Video akan diputar langsung di dalam kelas.</small></div>
        <div className="field"><label htmlFor="content">Isi materi</label><textarea className="input" id="content" name="content" required minLength={10} /></div>
        <label className="check-field"><input type="checkbox" name="isPreview" /> <span><strong>Jadikan preview gratis</strong><small>Pengunjung dapat melihat materi ini sebelum membeli.</small></span></label>
        <button className="btn" type="submit">Tambahkan materi</button>
      </form></section>
    </div>

    <aside className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Materi kursus</h2><span className="badge">{courseLessons.length}</span></div><div className="stack">
      {courseLessons.length ? courseLessons.map((lesson, index) => <article className="lesson lesson-manager" key={lesson.id}>
        <div className="lesson-manager-head"><div><small>MATERI {lesson.position}</small><h3>{lesson.title}</h3>{lesson.isPreview && <span className="badge badge-live">Preview gratis</span>}</div><div className="lesson-order-actions">
          <form action={moveLessonAction.bind(null, product.id, lesson.id, "up")}><button className="icon-btn" type="submit" title="Naikkan materi" disabled={index === 0}><ArrowUp size={15} /></button></form>
          <form action={moveLessonAction.bind(null, product.id, lesson.id, "down")}><button className="icon-btn" type="submit" title="Turunkan materi" disabled={index === courseLessons.length - 1}><ArrowDown size={15} /></button></form>
        </div></div>
        <p>{lesson.content.slice(0, 120)}{lesson.content.length > 120 ? "…" : ""}</p>
        <details className="lesson-editor"><summary><Pencil size={14} /> Edit materi</summary><form className="form" action={updateLessonAction.bind(null, product.id, lesson.id)}>
          <div className="field"><label htmlFor={`title-${lesson.id}`}>Judul</label><input className="input" id={`title-${lesson.id}`} name="title" defaultValue={lesson.title} required minLength={3} /></div>
          <div className="field"><label htmlFor={`video-${lesson.id}`}>URL video</label><input className="input" id={`video-${lesson.id}`} name="videoUrl" type="url" defaultValue={lesson.videoUrl ?? ""} placeholder="YouTube, Vimeo, Loom, atau file MP4" /></div>
          <div className="field"><label htmlFor={`content-${lesson.id}`}>Isi materi</label><textarea className="input" id={`content-${lesson.id}`} name="content" defaultValue={lesson.content} required minLength={10} /></div>
          <label className="check-field"><input type="checkbox" name="isPreview" defaultChecked={lesson.isPreview} /> <span><strong>Preview gratis</strong></span></label>
          <button className="btn btn-primary" type="submit">Simpan materi</button>
        </form><form className="lesson-delete" action={deleteLessonAction.bind(null, product.id, lesson.id)}><button className="btn btn-danger btn-compact" type="submit"><Trash2 size={14} /> Hapus materi</button></form></details>
      </article>) : <p className="muted">Belum ada materi. Tambahkan minimal satu materi sebelum diterbitkan.</p>}
    </div></aside></div>
  </div></main>;
}
