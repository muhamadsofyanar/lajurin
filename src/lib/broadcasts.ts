import { and, eq, sql } from "drizzle-orm";
import { db, pool } from "@/lib/db";
import { sendExternalNotification } from "@/lib/notifications";
import {
  broadcastCampaigns,
  broadcastDeliveries,
  broadcastDeliveryAttempts,
} from "@/lib/schema";
import { logEvent } from "@/lib/security";

export const BROADCAST_MAX_ATTEMPTS = 3;
export const BROADCAST_MAX_RECIPIENTS = 100;

export function broadcastDailyRecipientLimit() {
  const parsed = Number(process.env.BROADCAST_DAILY_RECIPIENT_LIMIT ?? 500);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10_000 ? parsed : 500;
}

export function broadcastBatchSize(requested?: number) {
  const configured = Number(process.env.BROADCAST_BATCH_SIZE ?? 20);
  const maximum = Number.isInteger(configured) && configured >= 1 && configured <= 50 ? configured : 20;
  return Math.max(1, Math.min(requested ?? maximum, maximum));
}

type ClaimedDelivery = {
  id: string;
  campaign_id: string;
  channel: "EMAIL" | "WHATSAPP";
  recipient: string;
  recipient_name: string | null;
  product_name: string | null;
  action_url: string | null;
  provider: string;
  attempt_count: number;
  subject: string | null;
  campaign_name: string;
  message: string;
};

function personalize(template: string, delivery: ClaimedDelivery) {
  const firstName = delivery.recipient_name?.trim().split(/\s+/)[0] || "Kak";
  return template
    .replaceAll("{nama}", firstName)
    .replaceAll("{produk}", delivery.product_name ?? "produk Anda")
    .replaceAll("{tautan}", delivery.action_url ?? "");
}

function providerFailure(error: unknown) {
  const candidate = error as { responseCode?: unknown; providerResponse?: unknown };
  return {
    responseCode: typeof candidate?.responseCode === "number" ? candidate.responseCode : null,
    providerResponse: candidate?.providerResponse ?? null,
    message: error instanceof Error ? error.message.slice(0, 500) : "Pengiriman gagal",
  };
}

async function refreshCampaignSummaries(campaignIds: string[]) {
  if (!campaignIds.length) return;
  const uniqueIds = [...new Set(campaignIds)];
  for (const campaignId of uniqueIds) {
    const [summary] = await db.select({
      total: sql<number>`count(*)::int`,
      sent: sql<number>`count(*) filter (where ${broadcastDeliveries.status} = 'SENT')::int`,
      failed: sql<number>`count(*) filter (where ${broadcastDeliveries.status} = 'FAILED')::int`,
      pending: sql<number>`count(*) filter (where ${broadcastDeliveries.status} in ('PENDING', 'PROCESSING'))::int`,
    }).from(broadcastDeliveries).where(eq(broadcastDeliveries.campaignId, campaignId));
    const complete = summary.pending === 0;
    const status = !complete ? "SENDING" : summary.failed === 0 ? "SENT" : summary.sent === 0 ? "FAILED" : "COMPLETED_WITH_ERRORS";
    await db.update(broadcastCampaigns).set({
      status,
      sentCount: summary.sent,
      failedCount: summary.failed,
      sentAt: summary.sent > 0 ? new Date() : null,
      completedAt: complete ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(broadcastCampaigns.id, campaignId));
  }
}

export async function processBroadcastQueue(input: { campaignId?: string; merchantId?: string; limit?: number } = {}) {
  const limit = broadcastBatchSize(input.limit);
  const result = await pool.query<ClaimedDelivery>(
    `WITH picked AS (
       SELECT d.id
       FROM broadcast_deliveries d
       INNER JOIN broadcast_campaigns c ON c.id = d.campaign_id
       WHERE d.status = 'PENDING'
         AND d.attempt_count < $1
         AND (d.next_attempt_at IS NULL OR d.next_attempt_at <= now())
         AND ($2::uuid IS NULL OR d.campaign_id = $2::uuid)
         AND ($3::uuid IS NULL OR c.merchant_id = $3::uuid)
       ORDER BY d.created_at
       FOR UPDATE OF d SKIP LOCKED
       LIMIT $4
     ),
     claimed AS (
       UPDATE broadcast_deliveries d
       SET status = 'PROCESSING', attempt_count = d.attempt_count + 1,
           last_attempt_at = now(), updated_at = now()
       FROM picked
       WHERE d.id = picked.id
       RETURNING d.*
     )
     SELECT claimed.id, claimed.campaign_id, claimed.channel, claimed.recipient,
            claimed.recipient_name, claimed.product_name, claimed.action_url,
            claimed.provider, claimed.attempt_count, c.subject,
            c.name AS campaign_name, c.message
     FROM claimed
     INNER JOIN broadcast_campaigns c ON c.id = claimed.campaign_id`,
    [BROADCAST_MAX_ATTEMPTS, input.campaignId ?? null, input.merchantId ?? null, limit],
  );

  let sent = 0;
  let failed = 0;
  for (const delivery of result.rows) {
    const text = personalize(delivery.message, delivery);
    try {
      const providerResult = await sendExternalNotification({
        channel: delivery.channel,
        recipient: delivery.recipient,
        subject: delivery.subject || delivery.campaign_name,
        text,
        actionUrl: delivery.action_url ?? undefined,
        actionLabel: "Buka tautan",
      });
      await db.transaction(async (tx) => {
        await tx.update(broadcastDeliveries).set({
          status: "SENT",
          responseCode: providerResult.responseCode,
          providerResponse: providerResult.providerResponse,
          errorMessage: null,
          nextAttemptAt: null,
          sentAt: new Date(),
          updatedAt: new Date(),
        }).where(and(eq(broadcastDeliveries.id, delivery.id), eq(broadcastDeliveries.status, "PROCESSING")));
        await tx.insert(broadcastDeliveryAttempts).values({
          deliveryId: delivery.id,
          attemptNumber: delivery.attempt_count,
          status: "SENT",
          responseCode: providerResult.responseCode,
          providerResponse: providerResult.providerResponse,
        }).onConflictDoNothing({ target: [broadcastDeliveryAttempts.deliveryId, broadcastDeliveryAttempts.attemptNumber] });
      });
      sent += 1;
    } catch (error) {
      const failure = providerFailure(error);
      await db.transaction(async (tx) => {
        await tx.update(broadcastDeliveries).set({
          status: "FAILED",
          responseCode: failure.responseCode,
          providerResponse: failure.providerResponse,
          errorMessage: failure.message,
          nextAttemptAt: null,
          updatedAt: new Date(),
        }).where(and(eq(broadcastDeliveries.id, delivery.id), eq(broadcastDeliveries.status, "PROCESSING")));
        await tx.insert(broadcastDeliveryAttempts).values({
          deliveryId: delivery.id,
          attemptNumber: delivery.attempt_count,
          status: "FAILED",
          responseCode: failure.responseCode,
          providerResponse: failure.providerResponse,
          errorMessage: failure.message,
        }).onConflictDoNothing({ target: [broadcastDeliveryAttempts.deliveryId, broadcastDeliveryAttempts.attemptNumber] });
      });
      failed += 1;
      logEvent("warn", "broadcast_delivery_failed", {
        campaignId: delivery.campaign_id,
        deliveryId: delivery.id,
        attempt: delivery.attempt_count,
        provider: delivery.provider,
      });
    }
  }
  await refreshCampaignSummaries(result.rows.map((delivery) => delivery.campaign_id));
  return { claimed: result.rows.length, sent, failed };
}

export async function retryFailedBroadcastDeliveries(campaignId: string, merchantId: string) {
  const [campaign] = await db.select({ id: broadcastCampaigns.id }).from(broadcastCampaigns).where(and(
    eq(broadcastCampaigns.id, campaignId),
    eq(broadcastCampaigns.merchantId, merchantId),
  )).limit(1);
  if (!campaign) return 0;
  const retried = await db.update(broadcastDeliveries).set({
    status: "PENDING",
    nextAttemptAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(broadcastDeliveries.campaignId, campaignId),
    eq(broadcastDeliveries.status, "FAILED"),
    sql`${broadcastDeliveries.attemptCount} < ${BROADCAST_MAX_ATTEMPTS}`,
  )).returning({ id: broadcastDeliveries.id });
  if (retried.length) {
    await db.update(broadcastCampaigns).set({ status: "QUEUED", completedAt: null, updatedAt: new Date() })
      .where(eq(broadcastCampaigns.id, campaignId));
  }
  return retried.length;
}

export async function recoverStaleBroadcastClaims() {
  const recovered = await db.update(broadcastDeliveries).set({
    status: "PENDING",
    nextAttemptAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(broadcastDeliveries.status, "PROCESSING"),
    sql`${broadcastDeliveries.lastAttemptAt} < now() - interval '15 minutes'`,
  )).returning({ id: broadcastDeliveries.id });
  return recovered.length;
}
