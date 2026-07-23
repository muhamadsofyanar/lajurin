import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Award } from "lucide-react";
import { and, asc, eq, inArray } from "drizzle-orm";
import { PrintButton } from "@/components/print-button";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { courses, enrollments, lessonProgress, lessons, products, users } from "@/lib/schema";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [courseRow] = await db.select({ course: courses, merchantName: users.name }).from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id))
    .innerJoin(users, eq(products.merchantId, users.id))
    .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, id))).limit(1);
  if (!courseRow) notFound();

  const courseLessons = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, id)).orderBy(asc(lessons.position));
  if (!courseLessons.length) redirect(`/member/courses/${id}`);
  const completed = await db.select({ lessonId: lessonProgress.lessonId, completedAt: lessonProgress.completedAt }).from(lessonProgress)
    .where(and(eq(lessonProgress.userId, user.id), inArray(lessonProgress.lessonId, courseLessons.map((lesson) => lesson.id))));
  if (new Set(completed.map((row) => row.lessonId)).size !== courseLessons.length) redirect(`/member/courses/${id}`);
  const completedAt = completed.reduce((latest, row) => row.completedAt > latest ? row.completedAt : latest, completed[0].completedAt);

  return <main className="certificate-page"><div className="certificate-actions no-print"><Link className="btn" href={`/member/courses/${id}`}>← Kembali ke kelas</Link><PrintButton /></div><section className="certificate-sheet">
    <div className="certificate-mark"><Award size={54} /></div><span className="certificate-kicker">SERTIFIKAT PENYELESAIAN</span><h1 className="display">Certificate of Completion</h1><p>Diberikan kepada</p><h2 className="display">{user.name}</h2><p>yang telah menyelesaikan seluruh materi pada kelas</p><h3>{courseRow.course.title}</h3><div className="certificate-meta"><div><span>Tanggal penyelesaian</span><strong>{formatDate(completedAt)}</strong></div><div><span>Penyelenggara</span><strong>{courseRow.merchantName}</strong></div></div><div className="certificate-sign"><span>Rizqhub</span><small>Belajar, bertumbuh, melajur.</small></div>
  </section></main>;
}
