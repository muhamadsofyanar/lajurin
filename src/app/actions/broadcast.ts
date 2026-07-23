"use server";

import { and, eq, inArray, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { getNotificationConfig, normalizedPhone, sendExternalNotification } from "@/lib/notifications";
import { auditLogs, broadcastCampaigns, broadcastDeliveries, orders, products } from "@/lib/schema";

type Recipient = { orderId: string; userId: string | null; name: string; email: string; phone: string | null; productName: string };

function personalize(template: string, recipient: Recipient) {
  return template.replaceAll("{nama}", recipient.name.split(/\s+/)[0] || "Kak").replaceAll("{produk}", recipient.productName);
}

export async function sendBroadcastAction(formData: FormData) {
  const merchant = await requireMerchant("manage");
  await requireFeature("CUSTOMER_BROADCASTS", merchant.id);
  const parsed = z.object({
    name: z.string().trim().min(3).max(100), audience: z.enum(["ALL_CUSTOMERS", "ABANDONED_CHECKOUT"]),
    subject: z.string().trim().max(160).optional(), message: z.string().trim().min(10).max(3000),
    sendEmail: z.boolean(), sendWhatsapp: z.boolean(),
  }).safeParse({
    name: formData.get("name"), audience: formData.get("audience"), subject: formData.get("subject") || undefined,
    message: formData.get("message"), sendEmail: formData.get("sendEmail") === "on", sendWhatsapp: formData.get("sendWhatsapp") === "on",
  });
  if (!parsed.success || (!parsed.data.sendEmail && !parsed.data.sendWhatsapp) || (parsed.data.sendEmail && !parsed.data.subject)) redirect("/dashboard/broadcasts?error=Lengkapi+kampanye,+subjek+email,+dan+minimal+satu+kanal");

  const conditions = parsed.data.audience === "ABANDONED_CHECKOUT"
    ? and(eq(products.merchantId, merchant.id), inArray(orders.status, ["PENDING", "FAILED", "EXPIRED"]), lt(orders.createdAt, new Date(Date.now() - 30 * 60_000)))
    : and(eq(products.merchantId, merchant.id), eq(orders.status, "PAID"));
  const rows = await db.select({ orderId: orders.id, userId: orders.customerId, name: orders.customerName, email: orders.customerEmail, phone: orders.customerPhone, productName: products.name })
    .from(orders).innerJoin(products, eq(products.id, orders.productId)).where(conditions).limit(500);
  const recipients = [...new Map(rows.map((row) => [row.email.toLowerCase(), row])).values()].slice(0, 100);
  if (!recipients.length) redirect("/dashboard/broadcasts?error=Tidak+ada+penerima+yang+memenuhi+audience");

  const config = getNotificationConfig();
  if ((parsed.data.sendEmail && !config.mailketingActive) || (parsed.data.sendWhatsapp && !config.starSenderActive)) redirect("/dashboard/broadcasts?error=Provider+kanal+yang+dipilih+belum+aktif+di+Environment+Variables");
  const [campaign] = await db.insert(broadcastCampaigns).values({ merchantId: merchant.id, name: parsed.data.name, audience: parsed.data.audience, subject: parsed.data.subject || null, message: parsed.data.message, sendEmail: parsed.data.sendEmail, sendWhatsapp: parsed.data.sendWhatsapp, status: "SENDING", recipientCount: recipients.length }).returning();

  const jobs = recipients.flatMap((recipient) => [
    parsed.data.sendEmail && { recipient, channel: "EMAIL" as const, address: recipient.email },
    parsed.data.sendWhatsapp && normalizedPhone(recipient.phone) && { recipient, channel: "WHATSAPP" as const, address: normalizedPhone(recipient.phone)! },
  ].filter((job): job is { recipient: Recipient; channel: "EMAIL" | "WHATSAPP"; address: string } => Boolean(job)));
  let sentCount = 0;
  let failedCount = 0;
  for (let index = 0; index < jobs.length; index += 10) {
    await Promise.all(jobs.slice(index, index + 10).map(async (job) => {
      try {
        await sendExternalNotification({ channel: job.channel, recipient: job.address, subject: parsed.data.subject || parsed.data.name, text: personalize(parsed.data.message, job.recipient) });
        sentCount += 1;
        await db.insert(broadcastDeliveries).values({ campaignId: campaign.id, orderId: job.recipient.orderId, userId: job.recipient.userId, channel: job.channel, recipient: job.address, status: "SENT", sentAt: new Date() });
      } catch (error) {
        failedCount += 1;
        await db.insert(broadcastDeliveries).values({ campaignId: campaign.id, orderId: job.recipient.orderId, userId: job.recipient.userId, channel: job.channel, recipient: job.address, status: "FAILED", errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Pengiriman gagal" });
      }
    }));
  }
  await db.transaction(async (tx) => {
    await tx.update(broadcastCampaigns).set({ status: failedCount === jobs.length ? "FAILED" : "SENT", sentCount, failedCount, sentAt: new Date(), updatedAt: new Date() }).where(eq(broadcastCampaigns.id, campaign.id));
    await tx.insert(auditLogs).values({ actorId: merchant.actorId, workspaceId: merchant.workspaceId, action: "BROADCAST_SENT", entityType: "BROADCAST_CAMPAIGN", entityId: campaign.id, metadata: { audience: parsed.data.audience, recipientCount: recipients.length, sentCount, failedCount } });
  });
  revalidatePath("/dashboard/broadcasts");
  redirect(`/dashboard/broadcasts?success=Broadcast+selesai:+${sentCount}+terkirim,+${failedCount}+gagal`);
}
