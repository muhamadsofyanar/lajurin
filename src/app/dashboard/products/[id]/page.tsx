import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowDown, ArrowUp, Download, ExternalLink, FileText, Pencil, Trash2 } from "lucide-react";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  addCourseModuleAction,
  addLessonAction,
  deleteCourseModuleAction,
  deleteLessonAction,
  deleteLessonAttachmentAction,
  moveCourseModuleAction,
  moveLessonAction,
  togglePublishAction,
  updateCourseModuleAction,
  updateLessonAction,
  updateProductAction,
  uploadLessonAttachmentAction,
} from "@/app/actions/product";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { featureEnabled } from "@/lib/feature-flags";
import { courseModules, courses, lessonAttachments, lessons, products } from "@/lib/schema";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function EditProductPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const merchant = await requireMerchant("manage");
  const { id } = await params;
  const { error } = await searchParams;
  const [row] = await db.select({ product: products, course: courses }).from(products)
    .leftJoin(courses, eq(courses.productId, products.id))
    .where(and(eq(products.id, id), eq(products.merchantId, merchant.id))).limit(1);
  if (!row) notFound();
  const { product } = row;
  if (product.type === "SERVICE") redirect(`/dashboard/services/products/${product.id}`);
  if (product.type === "DIGITAL") redirect(`/dashboard/digital-products/${product.id}`);
  if (!row.course) notFound();
  const landingBuilderEnabled = await featureEnabled("LANDING_PAGE_BUILDER", merchant.id);
  const modules = await db.select().from(courseModules).where(eq(courseModules.courseId, row.course.id)).orderBy(asc(courseModules.position));
  const courseLessons = await db.select().from(lessons).where(eq(lessons.courseId, row.course.id)).orderBy(asc(lessons.position));
  const attachments = courseLessons.length ? await db.select().from(lessonAttachments)
    .where(inArray(lessonAttachments.lessonId, courseLessons.map((lesson) => lesson.id))).orderBy(asc(lessonAttachments.createdAt)) : [];
  const moduleNames = new Map(modules.map((module) => [module.id, module.title]));
  const attachmentsByLesson = new Map<string, typeof attachments>();
  for (const attachment of attachments) {
    const current = attachmentsByLesson.get(attachment.lessonId) ?? [];
    current.push(attachment);
    attachmentsByLesson.set(attachment.lessonId, current);
  }

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><h1 className="display">{product.name}</h1><p>/p/{product.slug}</p></div><div className="actions">{landingBuilderEnabled && <Link className="btn" href={`/dashboard/products/${product.id}/landing`}>Landing page</Link>}<Link className="btn" href={`/dashboard/products/${product.id}/funnel`}>Kupon & funnel</Link>{product.status === "PUBLISHED" && <Link className="btn" href={`/p/${product.slug}`} target="_blank">Lihat halaman <ExternalLink size={15} /></Link>}<form action={togglePublishAction.bind(null, product.id)}><button className={`btn ${product.status === "PUBLISHED" ? "btn-danger" : "btn-lime"}`} type="submit">{product.status === "PUBLISHED" ? "Jadikan draf" : "Terbitkan"}</button></form></div></div>
    {error && <p className="alert" style={{ marginBottom: 18 }}>{error}</p>}
    <div className="two-col"><div className="stack">
      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Informasi produk</h2></div><form className="form" action={updateProductAction.bind(null, product.id)}>
        <input type="hidden" name="type" value="COURSE" />
        <div className="field"><label htmlFor="name">Nama</label><input className="input" id="name" name="name" defaultValue={product.name} required /></div>
        <div className="field"><label htmlFor="headline">Headline</label><input className="input" id="headline" name="headline" defaultValue={product.headline} required /></div>
        <div className="field"><label htmlFor="description">Deskripsi</label><textarea className="input" id="description" name="description" defaultValue={product.description} required /></div>
        <div className="field"><label htmlFor="price">Harga</label><input className="input" id="price" name="price" type="number" defaultValue={product.price} min={10000} step={1000} required /></div>
        <button className="btn btn-primary" type="submit">Simpan perubahan</button>
      </form></section>

      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Tambah bab</h2></div><form className="form" action={addCourseModuleAction.bind(null, product.id)}>
        <div className="field"><label htmlFor="module-title">Judul bab</label><input className="input" id="module-title" name="title" required minLength={3} placeholder="Contoh: Bab 1 · Fondasi" /></div>
        <div className="field"><label htmlFor="module-description">Deskripsi singkat (opsional)</label><textarea className="input" id="module-description" name="description" maxLength={500} /></div>
        <button className="btn" type="submit">Tambahkan bab</button>
      </form></section>

      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Tambah materi</h2></div><form className="form" action={addLessonAction.bind(null, product.id)}>
        <div className="field"><label htmlFor="title">Judul materi</label><input className="input" id="title" name="title" required minLength={3} /></div>
        <div className="field"><label htmlFor="moduleId">Bab</label><select className="input" id="moduleId" name="moduleId"><option value="">Tanpa bab</option>{modules.map((module) => <option value={module.id} key={module.id}>{module.position}. {module.title}</option>)}</select></div>
        <div className="field"><label htmlFor="videoUrl">URL video (opsional)</label><input className="input" id="videoUrl" name="videoUrl" type="url" placeholder="YouTube, Vimeo, Loom, atau file MP4" /><small className="field-hint">Video akan diputar langsung di dalam kelas.</small></div>
        <div className="field"><label htmlFor="content">Isi materi</label><textarea className="input" id="content" name="content" required minLength={10} /></div>
        <label className="check-field"><input type="checkbox" name="isPreview" /> <span><strong>Jadikan preview gratis</strong><small>Pengunjung dapat melihat materi ini sebelum membeli.</small></span></label>
        <button className="btn" type="submit">Tambahkan materi</button>
      </form></section>
    </div>

    <aside className="stack">
      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Susunan bab</h2><span className="badge">{modules.length}</span></div><div className="stack">
        {modules.length ? modules.map((module, index) => <article className="module-manager" key={module.id}>
          <div className="lesson-manager-head"><div><small>BAB {module.position}</small><h3>{module.title}</h3>{module.description && <p>{module.description}</p>}</div><div className="lesson-order-actions">
            <form action={moveCourseModuleAction.bind(null, product.id, module.id, "up")}><button className="icon-btn" type="submit" title="Naikkan bab" disabled={index === 0}><ArrowUp size={15} /></button></form>
            <form action={moveCourseModuleAction.bind(null, product.id, module.id, "down")}><button className="icon-btn" type="submit" title="Turunkan bab" disabled={index === modules.length - 1}><ArrowDown size={15} /></button></form>
          </div></div>
          <details className="lesson-editor"><summary><Pencil size={14} /> Edit bab</summary><form className="form" action={updateCourseModuleAction.bind(null, product.id, module.id)}>
            <div className="field"><label htmlFor={`module-title-${module.id}`}>Judul</label><input className="input" id={`module-title-${module.id}`} name="title" defaultValue={module.title} required minLength={3} /></div>
            <div className="field"><label htmlFor={`module-description-${module.id}`}>Deskripsi</label><textarea className="input" id={`module-description-${module.id}`} name="description" defaultValue={module.description ?? ""} maxLength={500} /></div>
            <button className="btn btn-primary" type="submit">Simpan bab</button>
          </form><form className="lesson-delete" action={deleteCourseModuleAction.bind(null, product.id, module.id)}><button className="btn btn-danger btn-compact" type="submit"><Trash2 size={14} /> Hapus bab</button></form></details>
        </article>) : <p className="muted">Belum ada bab. Materi tetap dapat dibuat tanpa bab.</p>}
      </div></section>

      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Materi kursus</h2><span className="badge">{courseLessons.length}</span></div><div className="stack">
        {courseLessons.length ? courseLessons.map((lesson, index) => {
          const lessonFiles = attachmentsByLesson.get(lesson.id) ?? [];
          return <article className="lesson lesson-manager" key={lesson.id}>
            <div className="lesson-manager-head"><div><small>MATERI {lesson.position}</small><h3>{lesson.title}</h3><div className="actions compact-tags">{lesson.moduleId && <span className="badge">{moduleNames.get(lesson.moduleId) ?? "Bab"}</span>}{lesson.isPreview && <span className="badge badge-live">Preview gratis</span>}</div></div><div className="lesson-order-actions">
              <form action={moveLessonAction.bind(null, product.id, lesson.id, "up")}><button className="icon-btn" type="submit" title="Naikkan materi" disabled={index === 0}><ArrowUp size={15} /></button></form>
              <form action={moveLessonAction.bind(null, product.id, lesson.id, "down")}><button className="icon-btn" type="submit" title="Turunkan materi" disabled={index === courseLessons.length - 1}><ArrowDown size={15} /></button></form>
            </div></div>
            <p>{lesson.content.slice(0, 120)}{lesson.content.length > 120 ? "…" : ""}</p>
            {lessonFiles.length > 0 && <div className="attachment-list">{lessonFiles.map((attachment) => <div className="attachment-row" key={attachment.id}><FileText size={16} /><span><strong>{attachment.fileName}</strong><small>{formatFileSize(attachment.size)}</small></span><Link className="icon-btn" href={`/api/course-file/${attachment.id}`} title="Unduh file"><Download size={15} /></Link><form action={deleteLessonAttachmentAction.bind(null, product.id, attachment.id)}><button className="icon-btn danger" type="submit" title="Hapus file"><Trash2 size={15} /></button></form></div>)}</div>}
            <details className="lesson-editor"><summary><Pencil size={14} /> Edit materi dan file</summary><form className="form" action={updateLessonAction.bind(null, product.id, lesson.id)}>
              <div className="field"><label htmlFor={`title-${lesson.id}`}>Judul</label><input className="input" id={`title-${lesson.id}`} name="title" defaultValue={lesson.title} required minLength={3} /></div>
              <div className="field"><label htmlFor={`module-${lesson.id}`}>Bab</label><select className="input" id={`module-${lesson.id}`} name="moduleId" defaultValue={lesson.moduleId ?? ""}><option value="">Tanpa bab</option>{modules.map((module) => <option value={module.id} key={module.id}>{module.position}. {module.title}</option>)}</select></div>
              <div className="field"><label htmlFor={`video-${lesson.id}`}>URL video</label><input className="input" id={`video-${lesson.id}`} name="videoUrl" type="url" defaultValue={lesson.videoUrl ?? ""} placeholder="YouTube, Vimeo, Loom, atau file MP4" /></div>
              <div className="field"><label htmlFor={`content-${lesson.id}`}>Isi materi</label><textarea className="input" id={`content-${lesson.id}`} name="content" defaultValue={lesson.content} required minLength={10} /></div>
              <label className="check-field"><input type="checkbox" name="isPreview" defaultChecked={lesson.isPreview} /> <span><strong>Preview gratis</strong></span></label>
              <button className="btn btn-primary" type="submit">Simpan materi</button>
            </form>
            <form className="form attachment-upload" action={uploadLessonAttachmentAction.bind(null, product.id, lesson.id)}><div className="field"><label htmlFor={`file-${lesson.id}`}>Tambah PDF/ebook/file bonus</label><input className="input file-input" id={`file-${lesson.id}`} name="file" type="file" required accept=".pdf,.epub,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" /><small className="field-hint">PDF, EPUB, ZIP, Office, atau TXT. Maksimal 15 MB.</small></div><button className="btn" type="submit">Unggah file</button></form>
            <form className="lesson-delete" action={deleteLessonAction.bind(null, product.id, lesson.id)}><button className="btn btn-danger btn-compact" type="submit"><Trash2 size={14} /> Hapus materi</button></form></details>
          </article>;
        }) : <p className="muted">Belum ada materi. Tambahkan minimal satu materi sebelum diterbitkan.</p>}
      </div></section>
    </aside></div>
  </div></main>;
}
