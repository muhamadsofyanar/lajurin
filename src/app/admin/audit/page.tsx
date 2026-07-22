import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { auditLogs, users } from "@/lib/schema";

export default async function AdminAuditPage() {
  const rows = await db.select({ log: auditLogs, actorName: users.name, actorEmail: users.email }).from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id)).orderBy(desc(auditLogs.createdAt)).limit(200);
  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">Audit log</h1><p>Jejak tindakan penting admin dan merchant. Catatan ini hanya-baca dari antarmuka.</p></div></div><section className="panel"><div className="panel-head"><h2>Aktivitas terbaru</h2><span className="muted">Maksimal 200 baris</span></div>{rows.length ? rows.map(({ log, actorName, actorEmail }) => <div className="audit-row" key={log.id}><div><strong>{log.action.replaceAll("_", " ")}</strong><small>{actorName ?? "Sistem"}{actorEmail ? ` · ${actorEmail}` : ""}</small></div><div><strong>{log.entityType}</strong><small>{log.entityId}</small></div><div><small>{formatDate(log.createdAt)}</small>{log.metadata !== null && log.metadata !== undefined ? <code>{JSON.stringify(log.metadata)}</code> : null}</div></div>) : <div className="empty"><p>Belum ada aktivitas yang tercatat.</p></div>}</section></div></main>;
}
