"use server";

import { and, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth";
import {
  BROADCAST_MAX_RECIPIENTS,
  broadcastDailyRecipientLimit,
  processBroadcastQueue,
  retryFailedBroadcastDeliveries,
} from "@/lib/broadcasts";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { getNotificationConfig, normalizedPhone } from "@/lib/notifications";
import {
  auditLogs,
  broadcastCampaigns,
  broadcastDeliveries,
  broadcastTemplates,
  orders,
  products,
} from "@/lib/schema";

type Recipient = {
  orderId: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  productId: string;
  productSlug: string;
  productName: string;
  paymentMethod: string | null;
  paymentUrl: string | null;
  consentAt: Date | null;
  createdAt: Date;
};

const campaignSchema = z.object({
  name: z.string().trim().min(3).max(100),
  audience: z.enum(["ALL_CUSTOMERS", "ABANDONED_CHECKOUT"]),
  productId: z.union([z.literal(""), z.string().uuid()]),
  subject: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10).max(3000),
  sendEmail: z.boolean(),
  sendWhatsapp: z.boolean(),
  consentConfirmed: z.literal(true),
});

export async function queueBroadcastAction(formData: FormData) {
  const merchant = await requireMerchant("broadcast");
  await requireFeature("CUSTOMER_BROADCASTS", merchant.id);
  const parsed = campaignSchema.safeParse({
    name: formData.get("name"),
    audience: formData.get("audience"),
    productId: formData.get("productId") || "",
    subject: formData.get("subject") || undefined,
    message: formData.get("message"),
    sendEmail: formData.get("sendEmail") === "on",
    sendWhatsapp: formData.get("sendWhatsapp") === "on",
    consentConfirmed: formData.get("consentConfirmed") === "on",
  });
  if (!parsed.success || (!parsed.data.sendEmail && !parsed.data.sendWhatsapp) || (parsed.data.sendEmail && !parsed.data.subject)) {
    redirect("/dashboard/broadcasts?error=Lengkapi+kampanye,+persetujuan+penerima,+subjek+email,+dan+minimal+satu+kanal");
  }
  const notificationConfig = getNotificationConfig();
  if ((parsed.data.sendEmail && !notificationConfig.mailketingActive) || (parsed.data.sendWhatsapp && !notificationConfig.starSenderActive)) {
    redirect("/dashboard/broadcasts?error=Provider+kanal+yang+dipilih+belum+aktif+di+Environment+Variables");
  }

  if (parsed.data.productId) {
    const [owned] = await db.select({ id: products.id }).from(products).where(and(
      eq(products.id, parsed.data.productId),
      eq(products.merchantId, merchant.id),
    )).limit(1);
    if (!owned) redirect("/dashboard/broadcasts?error=Produk+segmentasi+tidak+valid");
  }

  const now = new Date();
  const audienceCondition = parsed.data.audience === "ABANDONED_CHECKOUT"
    ? and(
        inArray(orders.status, ["PENDING", "FAILED", "EXPIRED"]),
        lt(orders.createdAt, new Date(now.getTime() - 30 * 60_000)),
        gt(orders.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60_000)),
      )
    : eq(orders.status, "PAID");
  const conditions = and(
    eq(products.merchantId, merchant.id),
    eq(orders.marketingConsent, true),
    audienceCondition,
    parsed.data.productId ? eq(products.id, parsed.data.productId) : undefined,
  );
  const rows: Recipient[] = await db.select({
    orderId: orders.id,
    userId: orders.customerId,
    name: orders.customerName,
    email: orders.customerEmail,
    phone: orders.customerPhone,
    productId: products.id,
    productSlug: products.slug,
    productName: products.name,
    paymentMethod: orders.paymentMethod,
    paymentUrl: orders.xenditPaymentUrl,
    consentAt: orders.marketingConsentAt,
    createdAt: orders.createdAt,
  }).from(orders).innerJoin(products, eq(products.id, orders.productId))
    .where(conditions).orderBy(sql`${orders.createdAt} desc`).limit(1_000);
  const recipients = [...new Map(rows.map((row) => [row.email.toLowerCase(), row])).values()]
    .filter((row) => parsed.data.sendEmail || Boolean(normalizedPhone(row.phone)))
    .slice(0, BROADCAST_MAX_RECIPIENTS);
  if (!recipients.length) redirect("/dashboard/broadcasts?error=Tidak+ada+penerima+berizin+yang+memenuhi+segmentasi");

  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const [{ usedToday }] = await db.select({
    usedToday: sql<number>`coalesce(sum(${broadcastCampaigns.recipientCount}), 0)::int`,
  }).from(broadcastCampaigns).where(and(
    eq(broadcastCampaigns.merchantId, merchant.id),
    gte(broadcastCampaigns.createdAt, startOfDay),
  ));
  const dailyLimit = broadcastDailyRecipientLimit();
  if (usedToday + recipients.length > dailyLimit) {
    redirect(`/dashboard/broadcasts?error=Batas+harian+${dailyLimit}+penerima+terlampaui.+Tersisa+${Math.max(0, dailyLimit - usedToday)}`);
  }

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const jobs = recipients.flatMap((recipient) => {
    const actionUrl = parsed.data.audience === "ABANDONED_CHECKOUT"
      ? recipient.paymentMethod === "XENDIT" && recipient.paymentUrl
        ? recipient.paymentUrl
        : `${appUrl}/payment/manual/${recipient.orderId}`
      : `${appUrl}/p/${recipient.productSlug}`;
    return [
      parsed.data.sendEmail && {
        recipient,
        channel: "EMAIL" as const,
        address: recipient.email.toLowerCase(),
        provider: "MAILKETING",
        actionUrl,
      },
      parsed.data.sendWhatsapp && normalizedPhone(recipient.phone) && {
        recipient,
        channel: "WHATSAPP" as const,
        address: normalizedPhone(recipient.phone)!,
        provider: "STARSENDER",
        actionUrl,
      },
    ].filter((job): job is {
      recipient: Recipient;
      channel: "EMAIL" | "WHATSAPP";
      address: string;
      provider: string;
      actionUrl: string;
    } => Boolean(job));
  });
  if (!jobs.length) redirect("/dashboard/broadcasts?error=Tidak+ada+alamat+email+atau+WhatsApp+valid+untuk+kanal+terpilih");

  const campaign = await db.transaction(async (tx) => {
    const [created] = await tx.insert(broadcastCampaigns).values({
      merchantId: merchant.id,
      productId: parsed.data.productId || null,
      createdBy: merchant.actorId,
      name: parsed.data.name,
      audience: parsed.data.audience,
      subject: parsed.data.subject || null,
      message: parsed.data.message,
      sendEmail: parsed.data.sendEmail,
      sendWhatsapp: parsed.data.sendWhatsapp,
      status: "QUEUED",
      recipientCount: recipients.length,
      recipientLimit: BROADCAST_MAX_RECIPIENTS,
      queuedAt: now,
    }).returning();
    await tx.insert(broadcastDeliveries).values(jobs.map((job) => ({
      campaignId: created.id,
      orderId: job.recipient.orderId,
      userId: job.recipient.userId,
      channel: job.channel,
      recipient: job.address,
      recipientName: job.recipient.name,
      productName: job.recipient.productName,
      actionUrl: job.actionUrl,
      provider: job.provider,
      status: "PENDING" as const,
      consentCapturedAt: job.recipient.consentAt ?? job.recipient.createdAt,
    })));
    await tx.insert(auditLogs).values({
      actorId: merchant.actorId,
      workspaceId: merchant.workspaceId,
      action: "BROADCAST_QUEUED",
      entityType: "BROADCAST_CAMPAIGN",
      entityId: created.id,
      metadata: {
        audience: parsed.data.audience,
        productId: parsed.data.productId || null,
        recipientCount: recipients.length,
        deliveryCount: jobs.length,
      },
    });
    return created;
  });

  revalidatePath("/dashboard/broadcasts");
  redirect(`/dashboard/broadcasts/${campaign.id}?success=Kampanye+masuk+antrean.+Proses+batch+pertama+saat+siap`);
}

export async function processBroadcastCampaignAction(campaignId: string) {
  const merchant = await requireMerchant("broadcast");
  await requireFeature("CUSTOMER_BROADCASTS", merchant.id);
  const [campaign] = await db.select({ id: broadcastCampaigns.id }).from(broadcastCampaigns).where(and(
    eq(broadcastCampaigns.id, campaignId),
    eq(broadcastCampaigns.merchantId, merchant.id),
  )).limit(1);
  if (!campaign) redirect("/dashboard/broadcasts?error=Kampanye+tidak+ditemukan");
  const result = await processBroadcastQueue({ campaignId, merchantId: merchant.id });
  revalidatePath("/dashboard/broadcasts");
  revalidatePath(`/dashboard/broadcasts/${campaignId}`);
  redirect(`/dashboard/broadcasts/${campaignId}?success=Batch+diproses:+${result.sent}+terkirim,+${result.failed}+gagal,+${result.claimed}+diambil`);
}

export async function retryBroadcastCampaignAction(campaignId: string) {
  const merchant = await requireMerchant("broadcast");
  await requireFeature("CUSTOMER_BROADCASTS", merchant.id);
  const count = await retryFailedBroadcastDeliveries(campaignId, merchant.id);
  revalidatePath(`/dashboard/broadcasts/${campaignId}`);
  redirect(`/dashboard/broadcasts/${campaignId}?success=${count}+pengiriman+gagal+dimasukkan+kembali+ke+antrean`);
}

export async function saveBroadcastTemplateAction(formData: FormData) {
  const merchant = await requireMerchant("broadcast");
  await requireFeature("CUSTOMER_BROADCASTS", merchant.id);
  const parsed = z.object({
    name: z.string().trim().min(3).max(80),
    subject: z.string().trim().max(160).optional(),
    message: z.string().trim().min(10).max(3000),
  }).safeParse({
    name: formData.get("templateName"),
    subject: formData.get("subject") || undefined,
    message: formData.get("message"),
  });
  if (!parsed.success) redirect("/dashboard/broadcasts?error=Nama+dan+isi+template+tidak+valid");
  await db.insert(broadcastTemplates).values({
    merchantId: merchant.id,
    name: parsed.data.name,
    subject: parsed.data.subject || null,
    message: parsed.data.message,
  }).onConflictDoUpdate({
    target: [broadcastTemplates.merchantId, broadcastTemplates.name],
    set: { subject: parsed.data.subject || null, message: parsed.data.message, updatedAt: new Date() },
  });
  revalidatePath("/dashboard/broadcasts");
  redirect("/dashboard/broadcasts?success=Template+pesan+berhasil+disimpan");
}

export async function deleteBroadcastTemplateAction(templateId: string) {
  const merchant = await requireMerchant("broadcast");
  await requireFeature("CUSTOMER_BROADCASTS", merchant.id);
  if (!z.string().uuid().safeParse(templateId).success) redirect("/dashboard/broadcasts?error=Template+tidak+valid");
  await db.delete(broadcastTemplates).where(and(
    eq(broadcastTemplates.id, templateId),
    eq(broadcastTemplates.merchantId, merchant.id),
  ));
  revalidatePath("/dashboard/broadcasts");
  redirect("/dashboard/broadcasts?success=Template+pesan+dihapus");
}
