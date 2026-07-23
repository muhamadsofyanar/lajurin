import Link from "next/link";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  processBroadcastCampaignAction,
  retryBroadcastCampaignAction,
} from "@/app/actions/broadcast";
import { requireMerchant } from "@/lib/auth";
import { BROADCAST_MAX_ATTEMPTS } from "@/lib/broadcasts";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import {
  broadcastCampaigns,
  broadcastDeliveries,
  broadcastDeliveryAttempts,
} from "@/lib/schema";

export default async function BroadcastCampaignPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const merchant = await requireMerchant("broadcast");
  await requireFeature("CUSTOMER_BROADCASTS", merchant.id);
  const { id } = await params;
  const { error, success } = await searchParams;
  const [campaign] = await db.select().from(broadcastCampaigns).where(and(
    eq(broadcastCampaigns.id, id),
    eq(broadcastCampaigns.merchantId, merchant.id),
  )).limit(1);
  if (!campaign) notFound();
  const deliveries = await db.select().from(broadcastDeliveries)
    .where(eq(broadcastDeliveries.campaignId, campaign.id)).orderBy(asc(broadcastDeliveries.createdAt));
  const attempts = deliveries.length ? await db.select({
    attempt: broadcastDeliveryAttempts,
    recipient: broadcastDeliveries.recipient,
    channel: broadcastDeliveries.channel,
  }).from(broadcastDeliveryAttempts)
    .innerJoin(broadcastDeliveries, eq(broadcastDeliveries.id, broadcastDeliveryAttempts.deliveryId))
    .where(inArray(broadcastDeliveryAttempts.deliveryId, deliveries.map((delivery) => delivery.id)))
    .orderBy(desc(broadcastDeliveryAttempts.createdAt)).limit(100) : [];
  const canProcess = deliveries.some((delivery) => delivery.status === "PENDING");
  const canRetry = deliveries.some((delivery) => delivery.status === "FAILED" && delivery.attemptCount < BROADCAST_MAX_ATTEMPTS);

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><span className="eyebrow">Antrean broadcast</span><h1 className="display" style={{ marginTop: 12 }}>{campaign.name}</h1><p>{campaign.recipientCount} penerima · {deliveries.length} delivery kanal · status {campaign.status}</p></div><div className="actions"><Link className="btn" href="/dashboard/broadcasts">Kembali</Link>{canProcess && <form action={processBroadcastCampaignAction.bind(null, campaign.id)}><button className="btn btn-primary" type="submit">Proses batch berikutnya</button></form>}{canRetry && <form action={retryBroadcastCampaignAction.bind(null, campaign.id)}><button className="btn" type="submit">Retry yang gagal</button></form>}</div></div>
    {error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}
    <div className="stats"><article className="stat"><span>Terkirim</span><strong>{campaign.sentCount}</strong></article><article className="stat"><span>Gagal</span><strong>{campaign.failedCount}</strong></article><article className="stat"><span>Maksimal retry</span><strong>{BROADCAST_MAX_ATTEMPTS}</strong></article></div>
    <section className="panel"><div className="panel-head"><h2>Log delivery</h2><span className="badge">{deliveries.length}</span></div>{deliveries.map((delivery) => <div className="audit-row" key={delivery.id}><div><strong>{delivery.recipientName || delivery.recipient}</strong><small>{delivery.productName} · consent {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(delivery.consentCapturedAt)}</small></div><div><span className={`badge status-${delivery.status.toLowerCase()}`}>{delivery.status}</span><small>{delivery.channel} · {delivery.provider} · percobaan {delivery.attemptCount}/{BROADCAST_MAX_ATTEMPTS}</small></div><div><small>{delivery.sentAt ? `Terkirim ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(delivery.sentAt)}` : delivery.errorMessage || "Menunggu antrean"}</small>{delivery.responseCode && <code>HTTP {delivery.responseCode}</code>}</div></div>)}</section>
    {attempts.length > 0 && <section className="panel"><div className="panel-head"><h2>Riwayat percobaan</h2><span className="badge">{attempts.length}</span></div>{attempts.map(({ attempt, recipient, channel }) => <div className="finance-row" key={attempt.id}><div><strong>{recipient}</strong><small>{channel} · percobaan {attempt.attemptNumber} · {attempt.status}</small>{attempt.errorMessage && <small className="check-fail">{attempt.errorMessage}</small>}</div><div>{attempt.responseCode && <code>HTTP {attempt.responseCode}</code>}<small>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(attempt.createdAt)}</small></div></div>)}</section>}
  </div></main>;
}
