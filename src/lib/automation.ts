import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { createInAppNotification } from "@/lib/in-app-notifications";
import { getNotificationConfig, normalizedPhone, sendExternalNotification } from "@/lib/notifications";
import {
  automationDeliveries,
  automationRules,
  courses,
  enrollments,
  merchantProfiles,
  orders,
  products,
  users,
} from "@/lib/schema";

type Trigger = "PURCHASED" | "COURSE_COMPLETED";

function fillTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value), template);
}

async function sourceContext(trigger: Trigger, sourceId: string) {
  if (trigger === "PURCHASED") {
    const [row] = await db.select({
      sourceId: orders.id,
      userId: orders.customerId,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      customerPhone: orders.customerPhone,
      productId: products.id,
      productName: products.name,
      merchantId: products.merchantId,
      merchantName: merchantProfiles.brandName,
    }).from(orders).innerJoin(products, eq(orders.productId, products.id))
      .leftJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
      .where(and(eq(orders.id, sourceId), eq(orders.status, "PAID"))).limit(1);
    return row ?? null;
  }

  const [row] = await db.select({
    sourceId: enrollments.id,
    userId: users.id,
    customerName: users.name,
    customerEmail: users.email,
    customerPhone: orders.customerPhone,
    productId: products.id,
    productName: products.name,
    merchantId: products.merchantId,
    merchantName: merchantProfiles.brandName,
  }).from(enrollments)
    .innerJoin(users, eq(enrollments.userId, users.id))
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id))
    .innerJoin(orders, eq(enrollments.orderId, orders.id))
    .leftJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .where(eq(enrollments.id, sourceId)).limit(1);
  return row ?? null;
}

export async function dispatchMerchantAutomations(trigger: Trigger, sourceId: string) {
  try {
    const context = await sourceContext(trigger, sourceId);
    if (!context) return;
    const rules = await db.select().from(automationRules).where(and(
      eq(automationRules.merchantId, context.merchantId),
      eq(automationRules.trigger, trigger),
      eq(automationRules.isActive, true),
      or(isNull(automationRules.productId), eq(automationRules.productId, context.productId)),
    ));
    if (!rules.length) return;

    const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const values = {
      nama: context.customerName.trim().split(/\s+/)[0] || context.customerName,
      produk: context.productName,
      nama_toko: context.merchantName ?? "Rizqhub",
      link_kelas: `${baseUrl}/member`,
    };
    const config = getNotificationConfig();

    for (const rule of rules) {
      const text = fillTemplate(rule.messageTemplate, values);
      const subject = fillTemplate(rule.emailSubject || rule.name, values);
      const phone = normalizedPhone(context.customerPhone);
      const candidates = [
        { channel: "EMAIL" as const, enabled: rule.sendEmail, active: config.mailketingActive, recipient: context.customerEmail, provider: "MAILKETING" },
        { channel: "WHATSAPP" as const, enabled: rule.sendWhatsapp, active: config.starSenderActive, recipient: phone, provider: "STARSENDER" },
      ];
      for (const candidate of candidates) {
        if (!candidate.enabled || !candidate.recipient) continue;
        const sourceKey = `${trigger}:${context.sourceId}`;
        const [delivery] = await db.insert(automationDeliveries).values({
          ruleId: rule.id,
          sourceKey,
          userId: context.userId,
          channel: candidate.channel,
          recipient: candidate.recipient,
          provider: candidate.provider,
        }).onConflictDoNothing({ target: [automationDeliveries.ruleId, automationDeliveries.sourceKey, automationDeliveries.channel] }).returning();
        if (!delivery) continue;
        if (!candidate.active) {
          await db.update(automationDeliveries).set({
            status: "SKIPPED",
            attemptCount: 1,
            errorMessage: config.enabled ? "Konfigurasi provider belum lengkap" : "Notifikasi dinonaktifkan",
            updatedAt: new Date(),
          }).where(eq(automationDeliveries.id, delivery.id));
          continue;
        }
        try {
          const result = await sendExternalNotification({ channel: candidate.channel, recipient: candidate.recipient, subject, text });
          await db.update(automationDeliveries).set({
            status: "SENT", attemptCount: 1, responseCode: result.responseCode,
            providerResponse: result.providerResponse, sentAt: new Date(), updatedAt: new Date(),
          }).where(eq(automationDeliveries.id, delivery.id));
        } catch (error) {
          await db.update(automationDeliveries).set({
            status: "FAILED", attemptCount: 1,
            errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Pengiriman gagal",
            updatedAt: new Date(),
          }).where(eq(automationDeliveries.id, delivery.id));
        }
      }
      if (context.userId) {
        await createInAppNotification({
          userId: context.userId,
          type: "AUTOMATION",
          title: subject,
          body: text,
          href: "/member",
          dedupeKey: `automation:${rule.id}:${trigger}:${context.sourceId}`,
        });
      }
    }
  } catch (error) {
    console.error("Merchant automation dispatch failed", error instanceof Error ? error.message : error);
  }
}
