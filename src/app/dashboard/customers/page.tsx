import { and, asc, eq, inArray } from "drizzle-orm";
import { MessageCircle, UsersRound } from "lucide-react";
import { startMerchantConversationAction } from "@/app/actions/inbox";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { courses, enrollments, lessonProgress, lessons, orders, products, users } from "@/lib/schema";

const segmentLabels = { ALL: "Semua progres", NOT_STARTED: "Belum mulai", IN_PROGRESS: "Sedang belajar", COMPLETED: "Selesai" } as const;
type ProgressSegment = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ product?: string; segment?: keyof typeof segmentLabels; error?: string }> }) {
  const merchant = await requireMerchant();
  const query = await searchParams;
  const merchantProducts = await db.select({ id: products.id, name: products.name }).from(products).where(eq(products.merchantId, merchant.id)).orderBy(asc(products.name));
  const productIds = merchantProducts.map((product) => product.id);
  const rows = productIds.length ? await db.select({ enrollment: enrollments, course: courses, product: products, member: users, order: orders }).from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id)).innerJoin(products, eq(courses.productId, products.id))
    .innerJoin(users, eq(enrollments.userId, users.id)).innerJoin(orders, eq(enrollments.orderId, orders.id))
    .where(and(inArray(products.id, productIds), query.product ? eq(products.id, query.product) : undefined)).orderBy(asc(users.name)) : [];
  const data = await Promise.all(rows.map(async (row) => {
    const courseLessons = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.courseId, row.course.id));
    const completed = courseLessons.length ? await db.select({ id: lessonProgress.id, completedAt: lessonProgress.completedAt }).from(lessonProgress)
      .where(and(eq(lessonProgress.userId, row.member.id), inArray(lessonProgress.lessonId, courseLessons.map((lesson) => lesson.id)))) : [];
    const percent = courseLessons.length ? Math.round(completed.length / courseLessons.length * 100) : 0;
    const segment: ProgressSegment = percent === 100 && courseLessons.length ? "COMPLETED" : percent > 0 ? "IN_PROGRESS" : "NOT_STARTED";
    return { ...row, percent, segment, lastActivity: completed.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())[0]?.completedAt ?? null };
  }));
  const segment = query.segment && query.segment in segmentLabels ? query.segment : "ALL";
  const filtered = segment === "ALL" ? data : data.filter((row) => row.segment === segment);
  const uniqueMembers = new Set(data.map((row) => row.member.id)).size;
  const completedCount = data.filter((row) => row.segment === "COMPLETED").length;
  return <main className="app-main"><div className="shell customers-shell"><div className="page-head"><div><span className="eyebrow">CRM sederhana</span><h1 className="display">Pelanggan</h1><p>Member, produk yang dimiliki, progres belajar, dan jalur komunikasi privat.</p></div></div>{query.error && <p className="alert">{query.error}</p>}<div className="stats stats-4"><article className="stat"><strong>{uniqueMembers}</strong><span>Member unik</span></article><article className="stat"><strong>{data.length}</strong><span>Enrollment</span></article><article className="stat"><strong>{data.filter((row) => row.segment === "IN_PROGRESS").length}</strong><span>Sedang belajar</span></article><article className="stat"><strong>{completedCount}</strong><span>Sudah selesai</span></article></div><form className="panel filter-bar customer-filters"><select className="input" name="product" defaultValue={query.product ?? ""}><option value="">Semua produk</option>{merchantProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select><select className="input" name="segment" defaultValue={segment}>{Object.entries(segmentLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="btn" type="submit">Terapkan filter</button></form><section className="panel"><div className="panel-head"><h2><UsersRound size={18} /> Daftar pelanggan</h2><span className="muted">{filtered.length} data</span></div>{filtered.length ? filtered.map((row) => <article className="customer-row" key={row.enrollment.id}><div><strong>{row.member.name}</strong><small>{row.member.email}{row.order.customerPhone ? ` · ${row.order.customerPhone}` : ""}</small></div><div><strong>{row.product.name}</strong><small>Bergabung {formatDate(row.enrollment.createdAt)}</small></div><div className="customer-progress"><span><small>{segmentLabels[row.segment]}</small><strong>{row.percent}%</strong></span><div className="progress-track"><span style={{ width: `${row.percent}%` }} /></div>{row.lastActivity && <small>Aktivitas terakhir {formatDate(row.lastActivity)}</small>}</div><form action={startMerchantConversationAction.bind(null, row.member.id, row.product.id)}><button className="btn btn-compact" type="submit"><MessageCircle size={15} /> Pesan</button></form></article>) : <div className="empty"><p>Tidak ada pelanggan pada filter ini.</p></div>}</section></div></main>;
}
