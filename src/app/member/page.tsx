import Link from "next/link";
import { ArrowRight, MessageCircle, ReceiptText } from "lucide-react";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, enrollments, lessons, orders } from "@/lib/schema";

export default async function MemberPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;
  const rows = await db.select({ course: courses, createdAt: enrollments.createdAt, lessonCount: count(lessons.id) }).from(enrollments).innerJoin(courses, eq(enrollments.courseId, courses.id)).leftJoin(lessons, eq(lessons.courseId, courses.id)).where(eq(enrollments.userId, user.id)).groupBy(courses.id, enrollments.createdAt).orderBy(desc(enrollments.createdAt));
  const pendingOrders = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.customerId, user.id), inArray(orders.status, ["PENDING", "AWAITING_CONFIRMATION", "REJECTED"])));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Dashboard member</span><h1 className="display" style={{marginTop:12}}>Halo, {user.name.split(" ")[0]}.</h1><p>Lanjutkan belajar dan terhubung dengan komunitas.</p></div>{user.role !== "MEMBER" && <Link className="btn" href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>Dashboard pengelola</Link>}</div>{error && <p className="alert">{error}</p>}<section className="stats"><div className="stat"><span>Kursus aktif</span><strong>{rows.length}</strong></div><Link className="stat stat-link" href="/member/orders"><span>Pesanan perlu perhatian</span><strong>{pendingOrders.length}</strong><small><ReceiptText size={14} /> Lihat pesanan</small></Link><Link className="stat stat-link" href="/community"><span>Ruang diskusi</span><strong><MessageCircle size={27} /> Komunitas</strong><small>Temui sesama member</small></Link></section><div className="panel-head standalone-head"><h2>Kursus saya</h2><span className="muted">{rows.length} kursus</span></div>{rows.length ? <div className="member-grid">{rows.map(({ course, lessonCount }) => <article className="course-card" key={course.id}><div className="course-cover"><h2 className="display">{course.title}</h2></div><div className="course-body"><span className="badge">{lessonCount} materi</span><p>{course.description}</p><Link className="btn btn-primary" href={`/member/courses/${course.id}`}>Mulai belajar <ArrowRight size={16} /></Link></div></article>)}</div> : <section className="panel empty"><h2>Belum ada kursus</h2><p>Kursus akan muncul setelah pembayaran disetujui.</p><Link className="btn" href="/member/orders">Periksa pesanan</Link></section>}</div></main>;
}
