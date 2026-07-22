import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Download, FileText, ListVideo } from "lucide-react";
import { and, asc, eq, inArray } from "drizzle-orm";
import { toggleLessonCompleteAction } from "@/app/actions/course";
import { startMemberConversationAction } from "@/app/actions/inbox";
import { VideoPlayer } from "@/components/video-player";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { courseModules, courses, enrollments, lessonAttachments, lessonProgress, lessons, merchantProfiles, products, users } from "@/lib/schema";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function CoursePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { lesson: requestedLessonId } = await searchParams;
  const [row] = await db.select({ course: courses, productId: products.id, merchantName: users.name, merchantBrand: merchantProfiles.brandName, merchantSlug: merchantProfiles.slug }).from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id))
    .innerJoin(users, eq(products.merchantId, users.id))
    .leftJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, id))).limit(1);
  if (!row) notFound();

  const courseLessons = await db.select().from(lessons).where(eq(lessons.courseId, row.course.id)).orderBy(asc(lessons.position));
  const modules = await db.select().from(courseModules).where(eq(courseModules.courseId, row.course.id)).orderBy(asc(courseModules.position));
  const progressRows = courseLessons.length ? await db.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress)
    .where(and(eq(lessonProgress.userId, user.id), inArray(lessonProgress.lessonId, courseLessons.map((lesson) => lesson.id)))) : [];
  const completedIds = new Set(progressRows.map((progress) => progress.lessonId));
  const selectedLesson = courseLessons.find((lesson) => lesson.id === requestedLessonId)
    ?? courseLessons.find((lesson) => !completedIds.has(lesson.id))
    ?? courseLessons[0];
  const selectedIndex = selectedLesson ? courseLessons.findIndex((lesson) => lesson.id === selectedLesson.id) : -1;
  const previousLesson = selectedIndex > 0 ? courseLessons[selectedIndex - 1] : null;
  const nextLesson = selectedIndex >= 0 && selectedIndex < courseLessons.length - 1 ? courseLessons[selectedIndex + 1] : null;
  const completedCount = completedIds.size;
  const progressPercent = courseLessons.length ? Math.round((completedCount / courseLessons.length) * 100) : 0;
  const selectedAttachments = selectedLesson ? await db.select().from(lessonAttachments)
    .where(eq(lessonAttachments.lessonId, selectedLesson.id)).orderBy(asc(lessonAttachments.createdAt)) : [];
  const groupedLessons = modules.map((module) => ({ module, lessons: courseLessons.filter((lesson) => lesson.moduleId === module.id) }));
  const ungroupedLessons = courseLessons.filter((lesson) => !lesson.moduleId || !modules.some((module) => module.id === lesson.moduleId));

  function LessonLink({ lesson }: { lesson: typeof courseLessons[number] }) {
    const complete = completedIds.has(lesson.id);
    const active = lesson.id === selectedLesson?.id;
    return <Link className={`course-lesson-link ${active ? "active" : ""}`} href={`/member/courses/${id}?lesson=${lesson.id}`} aria-current={active ? "page" : undefined}>
      {complete ? <CheckCircle2 size={19} /> : <Circle size={19} />}<span><small>MATERI {lesson.position}</small><strong>{lesson.title}</strong></span>
    </Link>;
  }

  return <main className="app-main course-page"><div className="course-shell">
    <div className="course-topbar">
      <div><Link className="muted course-back" href="/member">← Semua kursus</Link><h1 className="display">{row.course.title}</h1><p className="course-owner">Dikelola oleh {row.merchantSlug ? <Link href={`/m/${row.merchantSlug}`}>{row.merchantBrand ?? row.merchantName}</Link> : row.merchantName}</p><form action={startMemberConversationAction.bind(null, row.productId)}><button className="btn btn-compact course-contact" type="submit">Hubungi merchant</button></form></div>
      <div className="course-progress-summary"><div><span>{completedCount} dari {courseLessons.length} materi selesai</span><strong>{progressPercent}%</strong></div><div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div></div>
    </div>

    {courseLessons.length && selectedLesson ? <div className="course-learning-layout">
      <aside className="course-sidebar panel">
        <div className="course-sidebar-head"><ListVideo size={18} /><strong>Daftar materi</strong></div>
        <nav aria-label="Daftar materi kursus">
          {groupedLessons.filter((group) => group.lessons.length).map(({ module, lessons: moduleLessons }) => <section className="course-module-group" key={module.id}><div className="course-module-label"><small>BAB {module.position}</small><strong>{module.title}</strong></div>{moduleLessons.map((lesson) => <LessonLink lesson={lesson} key={lesson.id} />)}</section>)}
          {ungroupedLessons.length > 0 && <section className="course-module-group"><div className="course-module-label"><strong>Materi lainnya</strong></div>{ungroupedLessons.map((lesson) => <LessonLink lesson={lesson} key={lesson.id} />)}</section>}
        </nav>
      </aside>

      <article className="course-content panel">
        <div className="lesson-heading"><div><span className="eyebrow">Materi {selectedLesson.position} dari {courseLessons.length}</span><h2 className="display">{selectedLesson.title}</h2></div>{completedIds.has(selectedLesson.id) && <span className="lesson-complete-badge"><Check size={16} /> Selesai</span>}</div>
        {selectedLesson.videoUrl && <VideoPlayer url={selectedLesson.videoUrl} title={selectedLesson.title} />}
        <div className="lesson-copy">{selectedLesson.content}</div>
        {selectedAttachments.length > 0 && <section className="course-downloads"><div><span className="eyebrow">File pendamping</span><h3>Unduh materi lesson</h3></div><div className="attachment-list">{selectedAttachments.map((attachment) => <a className="attachment-row attachment-download" href={`/api/course-file/${attachment.id}`} key={attachment.id}><FileText size={18} /><span><strong>{attachment.fileName}</strong><small>{formatFileSize(attachment.size)}</small></span><Download size={17} /></a>)}</div></section>}
        <div className="lesson-actions">
          <div>{previousLesson && <Link className="btn" href={`/member/courses/${id}?lesson=${previousLesson.id}`}><ChevronLeft size={17} /> Sebelumnya</Link>}</div>
          <form action={toggleLessonCompleteAction.bind(null, id, selectedLesson.id)}><button className={`btn ${completedIds.has(selectedLesson.id) ? "" : "btn-lime"}`} type="submit">{completedIds.has(selectedLesson.id) ? "Batalkan selesai" : "Tandai selesai"}{!completedIds.has(selectedLesson.id) && <Check size={17} />}</button></form>
          <div>{nextLesson && <Link className="btn" href={`/member/courses/${id}?lesson=${nextLesson.id}`}>Berikutnya <ChevronRight size={17} /></Link>}</div>
        </div>
        {progressPercent === 100 && <div className="course-finished"><Award size={30} /><div><strong>Selamat, kelas ini sudah selesai!</strong><p>Anda dapat membuka sertifikat penyelesaian.</p></div><Link className="btn btn-primary" href={`/member/courses/${id}/certificate`}>Lihat sertifikat</Link></div>}
      </article>
    </div> : <section className="panel empty"><h2>Materi belum tersedia</h2><p>Pengelola kelas belum menambahkan materi.</p></section>}
  </div></main>;
}
