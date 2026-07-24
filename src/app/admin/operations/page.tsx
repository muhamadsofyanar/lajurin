import { and, count, desc, eq, gt, isNotNull, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { db, pool } from "@/lib/db";
import { configurationChecks, storageChecks } from "@/lib/runtime";
import { broadcastDeliveries, rateLimits, webhookEvents } from "@/lib/schema";
import { formatDate } from "@/lib/order";
import { outboxOperationalCounts } from "@/platform/events/worker";

export default async function AdminOperationsPage() {
  await requireAdmin();
  let databaseOk = false;
  try { await pool.query("SELECT 1"); databaseOk = true; } catch { databaseOk = false; }
  const [storage, webhooks, [{ activeBlocks }], [{ queuedBroadcasts }], [{ failedBroadcasts }], [{ failedWebhooks }], outbox] = await Promise.all([
    storageChecks(),
    db.select().from(webhookEvents).orderBy(desc(webhookEvents.createdAt)).limit(100),
    db.select({ activeBlocks: count() }).from(rateLimits).where(and(isNotNull(rateLimits.blockedUntil), gt(rateLimits.blockedUntil, new Date()))),
    db.select({ queuedBroadcasts: count() }).from(broadcastDeliveries).where(eq(broadcastDeliveries.status, "PENDING")),
    db.select({ failedBroadcasts: count() }).from(broadcastDeliveries).where(eq(broadcastDeliveries.status, "FAILED")),
    db.select({ failedWebhooks: count() }).from(webhookEvents).where(and(
      eq(webhookEvents.status, "FAILED"),
      sql`${webhookEvents.createdAt} >= now() - interval '24 hours'`,
    )),
    outboxOperationalCounts(),
  ]);
  const configuration = configurationChecks();
  const checks = [{ key: "db", label: "PostgreSQL", ok: databaseOk, detail: databaseOk ? "Terhubung" : "Tidak dapat dihubungi" }, ...configuration, ...storage];
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Production readiness</span><h1 className="display" style={{marginTop:12}}>Pusat operasional</h1><p>Status konfigurasi ditampilkan tanpa membuka nilai rahasia. Webhook bersifat hanya-baca dari halaman ini.</p></div><span className="badge">Blokir aktif: {activeBlocks}</span></div>
    <section className="stats stats-4">{checks.map((check) => <div className="stat" key={check.key}><span>{check.label}</span><strong className={check.ok ? "check-ok" : "check-fail"}>{check.ok ? "Siap" : "Perlu tindakan"}</strong><small>{check.detail}</small></div>)}</section>
    <section className="stats"><div className="stat"><span>Webhook gagal 24 jam</span><strong className={failedWebhooks ? "check-fail" : "check-ok"}>{failedWebhooks}</strong></div><div className="stat"><span>Outbox menunggu</span><strong>{(outbox.PENDING ?? 0) + (outbox.RETRY ?? 0)}</strong><small>Retry: {outbox.RETRY ?? 0}</small></div><div className="stat"><span>Dead letter</span><strong className={outbox.DEAD ? "check-fail" : "check-ok"}>{outbox.DEAD ?? 0}</strong></div><div className="stat"><span>Broadcast mengantre</span><strong>{queuedBroadcasts}</strong></div><div className="stat"><span>Broadcast gagal</span><strong className={failedBroadcasts ? "check-fail" : "check-ok"}>{failedBroadcasts}</strong></div></section>
    <section className="panel"><div className="panel-head"><h2>Webhook Xendit terbaru</h2><span className="muted">Maksimal 100 event</span></div>{webhooks.length ? webhooks.map((event) => <div className="audit-row" key={event.id}><div><strong>{event.eventName ?? "Payload tidak valid"}</strong><small>{event.externalId ?? "Tanpa reference ID"}</small></div><div><span className={`badge status-${event.status.toLowerCase()}`}>{event.status}</span><small>HTTP {event.responseStatus ?? "—"}</small></div><div><small>{formatDate(event.createdAt)}</small><code>{event.requestId}</code>{event.errorMessage && <small>{event.errorMessage}</small>}</div></div>) : <div className="empty"><p>Belum ada webhook yang tercatat.</p></div>}</section>
  </div></main>;
}
