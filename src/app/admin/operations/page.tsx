import { and, count, desc, gt, isNotNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, pool } from "@/lib/db";
import { configurationChecks, storageChecks } from "@/lib/runtime";
import { rateLimits, webhookEvents } from "@/lib/schema";
import { formatDate } from "@/lib/order";

export default async function AdminOperationsPage() {
  await requireAdmin();
  let databaseOk = false;
  try { await pool.query("SELECT 1"); databaseOk = true; } catch { databaseOk = false; }
  const [storage, webhooks, [{ activeBlocks }]] = await Promise.all([
    storageChecks(),
    db.select().from(webhookEvents).orderBy(desc(webhookEvents.createdAt)).limit(100),
    db.select({ activeBlocks: count() }).from(rateLimits).where(and(isNotNull(rateLimits.blockedUntil), gt(rateLimits.blockedUntil, new Date()))),
  ]);
  const configuration = configurationChecks();
  const checks = [{ key: "db", label: "PostgreSQL", ok: databaseOk, detail: databaseOk ? "Terhubung" : "Tidak dapat dihubungi" }, ...configuration, ...storage];
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Production readiness</span><h1 className="display" style={{marginTop:12}}>Pusat operasional</h1><p>Status konfigurasi ditampilkan tanpa membuka nilai rahasia. Webhook bersifat hanya-baca dari halaman ini.</p></div><span className="badge">Blokir aktif: {activeBlocks}</span></div>
    <section className="stats stats-4">{checks.map((check) => <div className="stat" key={check.key}><span>{check.label}</span><strong className={check.ok ? "check-ok" : "check-fail"}>{check.ok ? "Siap" : "Perlu tindakan"}</strong><small>{check.detail}</small></div>)}</section>
    <section className="panel"><div className="panel-head"><h2>Webhook Xendit terbaru</h2><span className="muted">Maksimal 100 event</span></div>{webhooks.length ? webhooks.map((event) => <div className="audit-row" key={event.id}><div><strong>{event.eventName ?? "Payload tidak valid"}</strong><small>{event.externalId ?? "Tanpa reference ID"}</small></div><div><span className={`badge status-${event.status.toLowerCase()}`}>{event.status}</span><small>HTTP {event.responseStatus ?? "—"}</small></div><div><small>{formatDate(event.createdAt)}</small><code>{event.requestId}</code>{event.errorMessage && <small>{event.errorMessage}</small>}</div></div>) : <div className="empty"><p>Belum ada webhook yang tercatat.</p></div>}</section>
  </div></main>;
}
