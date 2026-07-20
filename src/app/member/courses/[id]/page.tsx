import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { and, asc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, enrollments, lessons } from "@/lib/schema";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [row] = await db.select({ course: courses }).from(enrollments).innerJoin(courses, eq(enrollments.courseId, courses.id)).where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, id))).limit(1);
  if (!row) notFound();
  const courseLessons = await db.select().from(lessons).where(eq(lessons.courseId, row.course.id)).orderBy(asc(lessons.position));
  return <main className="app-main"><div className="shell" style={{maxWidth:860}}><div className="page-head"><div><Link className="muted" href="/member">← Semua kursus</Link><h1 className="display" style={{marginTop:14}}>{row.course.title}</h1><p>{row.course.description}</p></div></div><div className="stack">{courseLessons.map((lesson) => <article className="panel form-panel" key={lesson.id}><small style={{color:"var(--lime-dark)",fontWeight:900}}>MATERI {lesson.position}</small><h2 style={{margin:"8px 0 14px"}}>{lesson.title}</h2>{lesson.videoUrl && <a className="btn" href={lesson.videoUrl} target="_blank" rel="noreferrer" style={{marginBottom:16}}>Buka video <ExternalLink size={15} /></a>}<p style={{whiteSpace:"pre-wrap",lineHeight:1.8,color:"var(--muted)"}}>{lesson.content}</p></article>)}</div></div></main>;
}
