import type { DomainEvent, DomainEventHandler } from "./types";

type OrderNotificationPayload = {
  orderId: string;
  notificationEvent: "ORDER_CREATED" | "PAYMENT_APPROVED" | "PAYMENT_REJECTED" | "CHECKOUT_REMINDER";
};

type MerchantAutomationPayload = {
  sourceId: string;
  trigger: "PURCHASED" | "COURSE_COMPLETED";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function orderNotificationPayload(event: DomainEvent): OrderNotificationPayload {
  if (!isRecord(event.payload)) throw new Error("PAYLOAD_NOT_OBJECT");
  const orderId = event.payload.orderId;
  const notificationEvent = event.payload.notificationEvent;
  const validEvents = ["ORDER_CREATED", "PAYMENT_APPROVED", "PAYMENT_REJECTED", "CHECKOUT_REMINDER"];
  if (typeof orderId !== "string" || !validEvents.includes(String(notificationEvent))) {
    throw new Error("INVALID_ORDER_NOTIFICATION_PAYLOAD");
  }
  return { orderId, notificationEvent: notificationEvent as OrderNotificationPayload["notificationEvent"] };
}

function merchantAutomationPayload(event: DomainEvent): MerchantAutomationPayload {
  if (!isRecord(event.payload)) throw new Error("PAYLOAD_NOT_OBJECT");
  const sourceId = event.payload.sourceId;
  const trigger = event.payload.trigger;
  if (typeof sourceId !== "string" || (trigger !== "PURCHASED" && trigger !== "COURSE_COMPLETED")) {
    throw new Error("INVALID_MERCHANT_AUTOMATION_PAYLOAD");
  }
  return { sourceId, trigger };
}

const handlers: Readonly<Record<string, DomainEventHandler>> = Object.freeze({
  "notification.order.v1": async (event) => {
    const payload = orderNotificationPayload(event);
    const { dispatchOrderNotifications } = await import("@/lib/notifications");
    await dispatchOrderNotifications(payload.orderId, payload.notificationEvent);
  },
  "automation.merchant.v1": async (event) => {
    const payload = merchantAutomationPayload(event);
    const { dispatchMerchantAutomations } = await import("@/lib/automation");
    await dispatchMerchantAutomations(payload.trigger, payload.sourceId);
  },
});

export function resolveDomainEventHandler(eventType: string) {
  return handlers[eventType] ?? null;
}

export function registeredDomainEventTypes() {
  return Object.keys(handlers);
}
