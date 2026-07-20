import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { count, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, enrollments, lessons } from "@/lib/schema";

export default async function MemberPage() {
  const user = await requireUser();
  const rows = await db.select({ course: courses, createdAt: enrollments.createdAt, lessonCount: count(lessons.id) }).from(enrollments).innerJoin(courses, eq(enrollments.courseId, courses.id)).leftJoin(lessons, eq(lessons.courseId, courses.id)).where(eq(enrollments.userId, user.id)).groupBy(courses.id, enrollments.createdAt).orderBy(desc(enrollments.createdAt));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">Kursus saya</h1><p>Selamat belajar, {user.name}.</p></div>{user.role !== "MEMBER" && <Link className="btn" href="/dashboard">Dashboard merchant</Link>}</div>{rows.length ? <div className="member-grid">{rows.map(({ course, lessonCount }) => <article className="course-card" key={course.id}><div className="course-cover"><h2 className="display">{course.title}</h2></div><div className="course-body"><span className="badge">{lessonCount} materi</span><p>{course.description}</p><Link className="btn btn-primary" href={`/member/courses/${course.id}`}>Mulai belajar <ArrowRight size={16} /></Link></div></article>)}</div> : <section className="panel empty"><h2>Belum ada kursus</h2><p>Kursus yang sudah dibayar akan muncul otomatis di halaman ini.</p></section>}</div></main>;
}
