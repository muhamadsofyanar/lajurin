import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Bell, CheckCheck } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/actions/notification";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { inAppNotifications } from "@/lib/schema";

export default async function NotificationsPage() {
  const user = await requireUser();
  const rows = await db.select().from(inAppNotifications).where(eq(inAppNotifications.userId, user.id)).orderBy(desc(inAppNotifications.createdAt)).limit(100);
  const unread = rows.filter((row) => !row.readAt).length;
  return <div className="app"><Nav app /><main className="app-main"><div className="shell notification-shell"><div className="page-head"><div><span className="eyebrow">Pusat kabar</span><h1 className="display">Notifikasi</h1><p>Pesan, aktivitas komunitas, transaksi, dan automation terbaru.</p></div>{unread > 0 && <form action={markAllNotificationsReadAction}><button className="btn" type="submit"><CheckCheck size={17} /> Tandai semua dibaca</button></form>}</div><section className="panel"><div className="panel-head"><h2><Bell size={18} /> Terbaru</h2><span className="badge">{unread} belum dibaca</span></div>{rows.length ? rows.map((row) => <article className={`notification-card ${row.readAt ? "" : "unread"}`} key={row.id}><span className="notification-dot" /><div><strong>{row.title}</strong><p>{row.body}</p><small>{formatDate(row.createdAt)}</small></div><div className="notification-actions">{row.href && <Link className="btn btn-compact" href={row.href}>Buka</Link>}{!row.readAt && <form action={markNotificationReadAction.bind(null, row.id)}><button className="btn btn-compact" type="submit">Tandai dibaca</button></form>}</div></article>) : <div className="empty"><Bell size={34} /><h2>Belum ada notifikasi</h2><p>Kabar penting akan muncul di sini.</p></div>}</section></div></main></div>;
}
