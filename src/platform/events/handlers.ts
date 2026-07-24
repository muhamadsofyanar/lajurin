import { z } from "zod";
import { dispatchMerchantAutomations } from "@/lib/automation";
import { dispatchOrderNotifications } from "@/lib/notifications";

export type OutboxHandlerEvent = Readonly<{
  id: string;
  eventName: string;
  eventVersion: number;
  workspaceId: string;
  correlationId: string;
  payload: Record<string, unknown>;
}>;

type EventHandler = (event: OutboxHandlerEvent) => Promise<void>;

const orderPayload = z.object({ orderId: z.string().uuid() }).strict();

const handlers: Readonly<Record<string, EventHandler>> = {
  "order.paid.v1": async (event) => {
    const { orderId } = orderPayload.parse(event.payload);
    await dispatchOrderNotifications(orderId, "PAYMENT_APPROVED", { throwOnFailure: true });
    await dispatchMerchantAutomations("PURCHASED", orderId, { throwOnFailure: true });
  },
  "payment.rejected.v1": async (event) => {
    const { orderId } = orderPayload.parse(event.payload);
    await dispatchOrderNotifications(orderId, "PAYMENT_REJECTED", { throwOnFailure: true });
  },
};

export const OUTBOX_CONSUMER_NAME = "rizqhub-core-v1";

export function supportedEventNames() {
  return Object.keys(handlers);
}

export async function handleOutboxEvent(event: OutboxHandlerEvent) {
  const handler = handlers[event.eventName];
  if (!handler) throw new Error(`Handler event belum tersedia: ${event.eventName}`);
  await handler(event);
}
