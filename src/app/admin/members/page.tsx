import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate } from "@/lib/order";
import { enrollments, orders, users } from "@/lib/schema";

export default async function AdminMembersPage() {
  const members = await db.select().from(users).where(eq(users.role, "MEMBER")).orderBy(desc(users.createdAt));
  const rows = await Promise.all(members.map(async (member) => {
    const [[courseCount], [spend]] = await Promise.all([
      db.select({ value: count() }).from(enrollments).where(eq(enrollments.userId, member.id)),
      db.select({ value: sql<number>`coalesce(sum(${orders.amount}), 0)::integer` }).from(orders).where(eq(orders.customerId, member.id)),
    ]);
    return { member, courses: courseCount.value, spend: Number(spend.value ?? 0) };
  }));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">Member platform</h1><p>Daftar akun pembeli lintas merchant dan ringkasan akses kelas.</p></div></div><section className="panel"><div className="panel-head"><h2>Semua member</h2><span className="muted">{rows.length} akun</span></div>{rows.length ? rows.map(({ member, courses, spend }) => <div className="member-admin-row" key={member.id}><div><strong>{member.name}</strong><small>{member.email} · bergabung {formatDate(member.createdAt)}</small></div><div><strong>{courses} kelas</strong><small>Total pesanan {formatRupiah(spend)}</small></div></div>) : <div className="empty"><p>Belum ada akun member.</p></div>}</section></div></main>;
}
