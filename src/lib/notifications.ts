import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { notificationDeliveries, orders, products } from "@/lib/schema";
import { createInAppNotification } from "@/lib/in-app-notifications";

export type NotificationEvent = "ORDER_CREATED" | "PAYMENT_APPROVED" | "PAYMENT_REJECTED" | "CHECKOUT_REMINDER";
type NotificationChannel = "EMAIL" | "WHATSAPP";

const PROVIDER_TIMEOUT_MS = 10_000;
const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function getNotificationConfig() {
  const enabled = process.env.NOTIFICATIONS_ENABLED !== "false";
  const mailketingConfigured = Boolean(
    process.env.MAILKETING_API_TOKEN?.trim() &&
    process.env.MAILKETING_FROM_NAME?.trim() &&
    process.env.MAILKETING_FROM_EMAIL?.trim(),
  );
  const starSenderConfigured = Boolean(process.env.STARSENDER_API_KEY?.trim());
  return {
    enabled,
    mailketingConfigured,
    starSenderConfigured,
    mailketingActive: enabled && mailketingConfigured,
    starSenderActive: enabled && starSenderConfigured,
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]!);
}

export function normalizedPhone(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits.length >= 9 ? digits : null;
}

function notificationCopy(input: {
  event: NotificationEvent;
  customerName: string;
  productName: string;
  amount: number;
  orderId: string;
  paymentMethod: string | null;
  paymentUrl: string | null;
}) {
  const name = input.customerName.trim().split(/\s+/)[0] || "Kak";
  const orderNumber = input.orderId.slice(0, 8).toUpperCase();
  const courseUrl = `${appUrl()}/member`;
  const orderUrl = `${appUrl()}/member/orders`;
  const paymentUrl = input.paymentMethod === "MANUAL_TRANSFER"
    ? `${appUrl()}/payment/manual/${input.orderId}`
    : input.paymentUrl || orderUrl;

  if (input.event === "PAYMENT_APPROVED") {
    const subject = `Akses ${input.productName} sudah aktif`;
    const text = `Halo ${name}, pembayaran pesanan #${orderNumber} sudah dikonfirmasi. Akses ${input.productName} kini aktif. Buka kelas: ${courseUrl}`;
    return { subject, text, actionUrl: courseUrl, actionLabel: "Buka kelas" };
  }

  if (input.event === "PAYMENT_REJECTED") {
    const subject = `Bukti pembayaran #${orderNumber} perlu diperbaiki`;
    const text = `Halo ${name}, bukti pembayaran pesanan #${orderNumber} belum dapat kami setujui. Silakan periksa dan unggah kembali bukti yang benar: ${paymentUrl}`;
    return { subject, text, actionUrl: paymentUrl, actionLabel: "Unggah ulang bukti" };
  }

  if (input.event === "CHECKOUT_REMINDER") {
    const subject = `Pesanan #${orderNumber} masih menunggu pembayaran`;
    const text = `Halo ${name}, pesanan ${input.productName} senilai ${formatRupiah(input.amount)} belum selesai. Lanjutkan pembayaran sebelum pesanan berakhir: ${paymentUrl}`;
    return { subject, text, actionUrl: paymentUrl, actionLabel: "Lanjutkan pembayaran" };
  }

  const subject = `Pesanan #${orderNumber} berhasil dibuat`;
  const text = `Halo ${name}, pesanan ${input.productName} senilai ${formatRupiah(input.amount)} berhasil dibuat. Selesaikan pembayaran melalui: ${paymentUrl}`;
  return { subject, text, actionUrl: paymentUrl, actionLabel: "Selesaikan pembayaran" };
}

function emailHtml(copy: ReturnType<typeof notificationCopy>) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17212b;max-width:600px;margin:auto"><h2>${escapeHtml(copy.subject)}</h2><p>${escapeHtml(copy.text).replace(escapeHtml(copy.actionUrl), "")}</p><p><a href="${escapeHtml(copy.actionUrl)}" style="display:inline-block;padding:12px 18px;background:#173f35;color:#fff;text-decoration:none;border-radius:8px">${escapeHtml(copy.actionLabel)}</a></p><p style="font-size:12px;color:#667085">Pesan otomatis dari Rizqhub.</p></div>`;
}

async function responseBody(response: Response) {
  const text = (await response.text()).slice(0, 2_000);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

async function sendMailketing(input: { recipient: string; subject: string; content: string }) {
  const body = new URLSearchParams({
    api_token: process.env.MAILKETING_API_TOKEN!,
    from_name: process.env.MAILKETING_FROM_NAME!,
    from_email: process.env.MAILKETING_FROM_EMAIL!,
    recipient: input.recipient,
    subject: input.subject,
    content: input.content,
  });
  const response = await fetch("https://api.mailketing.co.id/api/v1/send", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    cache: "no-store",
  });
  const providerResponse = await responseBody(response);
  const responseObject = providerResponse && typeof providerResponse === "object" ? providerResponse as Record<string, unknown> : {};
  const providerMessage = String(responseObject.message ?? "").toLowerCase();
  const rejected = responseObject.success === false || String(responseObject.status ?? "").toLowerCase() === "failed" || providerMessage.startsWith("failed") || providerMessage.startsWith("error");
  if (!response.ok || rejected) throw new ProviderError("Mailketing menolak pengiriman", response.status, providerResponse);
  return { responseCode: response.status, providerResponse };
}

async function sendStarSender(input: { recipient: string; body: string }) {
  const response = await fetch("https://api.starsender.online/api/send", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: process.env.STARSENDER_API_KEY! },
    body: JSON.stringify({ messageType: "text", to: input.recipient, body: input.body }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    cache: "no-store",
  });
  const providerResponse = await responseBody(response);
  const responseObject = providerResponse && typeof providerResponse === "object" ? providerResponse as Record<string, unknown> : {};
  if (!response.ok || responseObject.success !== true) throw new ProviderError("StarSender menolak pengiriman", response.status, providerResponse);
  return { responseCode: response.status, providerResponse };
}

export async function sendExternalNotification(input: {
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  text: string;
  actionUrl?: string;
  actionLabel?: string;
}) {
  const actionUrl = input.actionUrl ?? appUrl();
  return input.channel === "EMAIL"
    ? sendMailketing({
        recipient: input.recipient,
        subject: input.subject,
        content: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17212b;max-width:600px;margin:auto"><h2>${escapeHtml(input.subject)}</h2><p>${escapeHtml(input.text).replace(/\n/g, "<br>")}</p><p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 18px;background:#173f35;color:#fff;text-decoration:none;border-radius:8px">${escapeHtml(input.actionLabel ?? "Buka Rizqhub")}</a></p><p style="font-size:12px;color:#667085">Pesan otomatis dari Rizqhub.</p></div>`,
      })
    : sendStarSender({ recipient: input.recipient, body: input.text });
}

class ProviderError extends Error {
  constructor(message: string, readonly responseCode: number, readonly providerResponse: unknown) {
    super(message);
  }
}

async function reserveDelivery(input: {
  orderId: string;
  event: NotificationEvent;
  channel: NotificationChannel;
  recipient: string;
  provider: string;
}) {
  const [created] = await db.insert(notificationDeliveries).values({ ...input, status: "PENDING" })
    .onConflictDoNothing({ target: [notificationDeliveries.orderId, notificationDeliveries.channel, notificationDeliveries.event] })
    .returning();
  return created ?? null;
}

async function deliver(delivery: typeof notificationDeliveries.$inferSelect, copy: ReturnType<typeof notificationCopy>) {
  try {
    const result = delivery.channel === "EMAIL"
      ? await sendMailketing({ recipient: delivery.recipient, subject: copy.subject, content: emailHtml(copy) })
      : await sendStarSender({ recipient: delivery.recipient, body: copy.text });
    await db.update(notificationDeliveries).set({
      status: "SENT",
      attemptCount: delivery.attemptCount + 1,
      responseCode: result.responseCode,
      providerResponse: result.providerResponse,
      errorMessage: null,
      sentAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(notificationDeliveries.id, delivery.id));
    return true;
  } catch (error) {
    const providerError = error instanceof ProviderError ? error : null;
    await db.update(notificationDeliveries).set({
      status: "FAILED",
      attemptCount: delivery.attemptCount + 1,
      responseCode: providerError?.responseCode ?? null,
      providerResponse: providerError?.providerResponse ?? null,
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Pengiriman gagal",
      updatedAt: new Date(),
    }).where(eq(notificationDeliveries.id, delivery.id));
    return false;
  }
}

async function orderNotificationContext(orderId: string) {
  const [row] = await db.select({ order: orders, productName: products.name }).from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(eq(orders.id, orderId)).limit(1);
  return row ?? null;
}

export async function dispatchOrderNotifications(orderId: string, event: NotificationEvent) {
  try {
    const row = await orderNotificationContext(orderId);
    if (!row) return;
    const config = getNotificationConfig();
    const copy = notificationCopy({
      event,
      customerName: row.order.customerName,
      productName: row.productName,
      amount: row.order.amount,
      orderId: row.order.id,
      paymentMethod: row.order.paymentMethod,
      paymentUrl: row.order.xenditPaymentUrl,
    });
    if (row.order.customerId) {
      await createInAppNotification({
        userId: row.order.customerId,
        type: event,
        title: copy.subject,
        body: copy.text,
        href: copy.actionUrl.replace(appUrl(), "") || "/member",
        dedupeKey: `order:${orderId}:${event}`,
      });
    }
    const phone = normalizedPhone(row.order.customerPhone);
    const candidates: Array<{ channel: NotificationChannel; recipient: string | null; provider: string; active: boolean }> = [
      { channel: "EMAIL", recipient: row.order.customerEmail, provider: "MAILKETING", active: config.mailketingActive },
      { channel: "WHATSAPP", recipient: phone, provider: "STARSENDER", active: config.starSenderActive },
    ];
    await Promise.all(candidates.map(async (candidate) => {
      if (!candidate.recipient) return;
      const delivery = await reserveDelivery({ orderId, event, channel: candidate.channel, recipient: candidate.recipient, provider: candidate.provider });
      if (!delivery) return;
      if (!candidate.active) {
        await db.update(notificationDeliveries).set({
          status: "SKIPPED",
          errorMessage: config.enabled ? "Konfigurasi provider belum lengkap" : "Notifikasi dinonaktifkan",
          updatedAt: new Date(),
        }).where(eq(notificationDeliveries.id, delivery.id));
        return;
      }
      await deliver(delivery, copy);
    }));
  } catch (error) {
    console.error("Notification dispatch failed", error instanceof Error ? error.message : error);
  }
}

export async function retryNotificationDelivery(deliveryId: string) {
  const [delivery] = await db.select().from(notificationDeliveries).where(and(
    eq(notificationDeliveries.id, deliveryId),
    inArray(notificationDeliveries.status, ["FAILED", "SKIPPED"]),
  )).limit(1);
  if (!delivery?.orderId) return false;
  const row = await orderNotificationContext(delivery.orderId);
  if (!row) return false;
  const config = getNotificationConfig();
  const active = delivery.channel === "EMAIL" ? config.mailketingActive : config.starSenderActive;
  if (!active) return false;
  const copy = notificationCopy({
    event: delivery.event,
    customerName: row.order.customerName,
    productName: row.productName,
    amount: row.order.amount,
    orderId: row.order.id,
    paymentMethod: row.order.paymentMethod,
    paymentUrl: row.order.xenditPaymentUrl,
  });
  return deliver(delivery, copy);
}
