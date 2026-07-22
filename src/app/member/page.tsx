import Link from "next/link";
import { ArrowRight, MessageCircle, ReceiptText } from "lucide-react";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, enrollments, lessonProgress, lessons, merchantProfiles, orders, products, users } from "@/lib/schema";

export default async function MemberPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { error } = await searchParams;
  const rows = await db.select({
    course: courses,
    createdAt: enrollments.createdAt,
    lessonCount: count(lessons.id),
    completedCount: count(lessonProgress.id),
    merchantName: users.name,
    merchantBrand: merchantProfiles.brandName,
    merchantSlug: merchantProfiles.slug,
  }).from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id))
    .innerJoin(users, eq(products.merchantId, users.id))
    .leftJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .leftJoin(lessons, eq(lessons.courseId, courses.id))
    .leftJoin(lessonProgress, and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, user.id)))
    .where(eq(enrollments.userId, user.id))
    .groupBy(courses.id, enrollments.createdAt, users.name, merchantProfiles.brandName, merchantProfiles.slug)
    .orderBy(desc(enrollments.createdAt));
  const pendingOrders = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.customerId, user.id), inArray(orders.status, ["PENDING", "AWAITING_CONFIRMATION", "REJECTED"])));

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><span className="eyebrow">Kelas saya · area member</span><h1 className="display" style={{ marginTop: 12 }}>Halo, {user.name.split(" ")[0]}.</h1><p>Semua kursus yang Anda beli dari berbagai merchant tampil di sini.</p></div>{user.role !== "MEMBER" && <Link className="btn" href={user.role === "ADMIN" ? "/admin" : "/dashboard"}>{user.role === "ADMIN" ? "Kembali ke Admin" : "Buka Dashboard usaha"}</Link>}</div>
    {error && <p className="alert">{error}</p>}
    <section className="stats"><div className="stat"><span>Kursus aktif</span><strong>{rows.length}</strong></div><Link className="stat stat-link" href="/member/orders"><span>Pesanan perlu perhatian</span><strong>{pendingOrders.length}</strong><small><ReceiptText size={14} /> Lihat pesanan</small></Link><Link className="stat stat-link" href="/community"><span>Ruang diskusi</span><strong><MessageCircle size={27} /> Komunitas</strong><small>Temui sesama member</small></Link></section>
    <div className="panel-head standalone-head"><h2>Kursus saya</h2><span className="muted">{rows.length} kursus</span></div>
    {rows.length ? <div className="member-grid">{rows.map(({ course, lessonCount, completedCount, merchantName, merchantBrand, merchantSlug }) => {
      const progress = lessonCount ? Math.round((completedCount / lessonCount) * 100) : 0;
      return <article className="course-card" key={course.id}><div className="course-cover"><div><small>OLEH {merchantBrand ?? merchantName}</small><h2 className="display">{course.title}</h2></div></div><div className="course-body">{merchantSlug && <Link className="course-merchant" href={`/m/${merchantSlug}`}>Lihat profil {merchantBrand ?? merchantName}</Link>}<div className="course-card-progress"><span>{completedCount}/{lessonCount} materi</span><strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p>{course.description}</p><Link className="btn btn-primary" href={`/member/courses/${course.id}`}>{progress ? "Lanjutkan belajar" : "Mulai belajar"} <ArrowRight size={16} /></Link></div></article>;
    })}</div> : <section className="panel empty"><h2>Belum ada kursus</h2><p>Kursus akan muncul setelah pembayaran disetujui.</p><Link className="btn" href="/member/orders">Periksa pesanan</Link></section>}
  </div></main>;
}
