import { randomUUID } from "node:crypto";

const SAFE_ID = /^[a-zA-Z0-9._:-]{1,128}$/;

export type CorrelationContext = Readonly<{
  requestId: string;
  correlationId: string;
  traceId: string;
}>;

function safeIdentifier(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && SAFE_ID.test(trimmed) ? trimmed : null;
}

export function correlationContextFromHeaders(input: Headers): CorrelationContext {
  const requestId = safeIdentifier(input.get("x-request-id")) ?? randomUUID();
  const correlationId = safeIdentifier(input.get("x-correlation-id")) ?? requestId;
  const traceId = safeIdentifier(input.get("x-trace-id")) ?? correlationId;
  return Object.freeze({ requestId, correlationId, traceId });
}

export function correlationHeaders(context: CorrelationContext) {
  return {
    "x-request-id": context.requestId,
    "x-correlation-id": context.correlationId,
    "x-trace-id": context.traceId,
  } as const;
}
