import { count, desc, eq } from "drizzle-orm";
import { Mail, MessageSquareText } from "lucide-react";
import { retryNotificationAction } from "@/app/actions/integration";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getNotificationConfig } from "@/lib/notifications";
import { formatDate } from "@/lib/order";
import { notificationDeliveries, orders, products } from "@/lib/schema";

const eventLabel = {
  ORDER_CREATED: "Pesanan dibuat",
  PAYMENT_APPROVED: "Pembayaran disetujui",
  PAYMENT_REJECTED: "Pembayaran ditolak",
} as const;

const statusLabel = {
  PENDING: "Diproses",
  SENT: "Terkirim",
  FAILED: "Gagal",
  SKIPPED: "Dilewati",
} as const;

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  await requireAdmin();
  const { success, error } = await searchParams;
  const config = getNotificationConfig();
  const [rows, statusCounts] = await Promise.all([
    db.select({ delivery: notificationDeliveries, productName: products.name })
      .from(notificationDeliveries)
      .leftJoin(orders, eq(notificationDeliveries.orderId, orders.id))
      .leftJoin(products, eq(orders.productId, products.id))
      .orderBy(desc(notificationDeliveries.createdAt))
      .limit(100),
    db.select({ status: notificationDeliveries.status, total: count() })
      .from(notificationDeliveries)
      .groupBy(notificationDeliveries.status),
  ]);
  const totals = Object.fromEntries(statusCounts.map((item) => [item.status, item.total]));
  const totalLogs = statusCounts.reduce((sum, item) => sum + item.total, 0);

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><span className="eyebrow">Automation</span><h1 className="display" style={{marginTop:12}}>Integrasi notifikasi</h1><p>Lajurin menentukan kapan pesan dikirim; StarSender mengirim WhatsApp dan Mailketing mengirim email.</p></div></div>
    {success && <p className="alert alert-success">{success}</p>}{error && <p className="alert">{error}</p>}
    {!config.enabled && <p className="alert">Notifikasi sedang dinonaktifkan melalui environment variable.</p>}
    <section className="integration-grid">
      <article className="panel provider-card"><MessageSquareText size={28} /><div><span className="eyebrow">WhatsApp</span><h2>StarSender</h2><p>API key {config.starSenderConfigured ? "sudah terbaca" : "belum lengkap"}.</p></div><span className={`badge ${config.starSenderActive ? "status-paid" : "status-failed"}`}>{config.starSenderActive ? "Aktif" : "Belum aktif"}</span></article>
      <article className="panel provider-card"><Mail size={28} /><div><span className="eyebrow">Email</span><h2>Mailketing</h2><p>Token dan identitas pengirim {config.mailketingConfigured ? "sudah terbaca" : "belum lengkap"}.</p></div><span className={`badge ${config.mailketingActive ? "status-paid" : "status-failed"}`}>{config.mailketingActive ? "Aktif" : "Belum aktif"}</span></article>
    </section>
    <section className="stats stats-4"><div className="stat"><span>Total log</span><strong>{totalLogs}</strong></div><div className="stat"><span>Terkirim</span><strong>{totals.SENT ?? 0}</strong></div><div className="stat"><span>Gagal</span><strong>{totals.FAILED ?? 0}</strong></div><div className="stat"><span>Dilewati</span><strong>{totals.SKIPPED ?? 0}</strong></div></section>
    <section className="panel"><div className="panel-head"><h2>Riwayat pengiriman</h2><span className="muted">100 log terbaru</span></div>{rows.length ? rows.map(({ delivery, productName }) => <div className="table-row notification-row" key={delivery.id}><div><strong>{eventLabel[delivery.event]} · {delivery.channel === "EMAIL" ? "Email" : "WhatsApp"}</strong><small>{productName ?? "Pesanan terhapus"} · {delivery.recipient}</small><small>{formatDate(delivery.createdAt)} · Percobaan {delivery.attemptCount}</small>{delivery.errorMessage && <small className="notification-error">{delivery.errorMessage}</small>}</div><span className={`badge status-${delivery.status.toLowerCase()}`}>{statusLabel[delivery.status]}</span>{(delivery.status === "FAILED" || delivery.status === "SKIPPED") && <form action={retryNotificationAction.bind(null, delivery.id)}><button className="btn" type="submit">Kirim ulang</button></form>}</div>) : <div className="empty"><p>Belum ada pengiriman. Buat pesanan uji setelah provider aktif.</p></div>}</section>
  </div></main>;
}
