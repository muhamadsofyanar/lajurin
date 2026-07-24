import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runOutboxWorkerOnce } from "@/platform/jobs/outbox-worker";
import { correlationContextFromHeaders } from "@/platform/observability/context";
import { structuredLog } from "@/platform/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeSecretEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function authorized(request: Request) {
  const expected = process.env.INTERNAL_JOB_SECRET;
  if (!expected || expected.length < 32) return false;
  const authorization = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const explicitHeader = request.headers.get("x-internal-job-secret") ?? "";
  return safeSecretEqual(authorization, expected) || safeSecretEqual(explicitHeader, expected);
}

export async function POST(request: Request) {
  const context = correlationContextFromHeaders(request.headers);
  if (!authorized(request)) {
    structuredLog("warn", "outbox_worker_unauthorized", {
      request_id: context.requestId,
      correlation_id: context.correlationId,
    });
    return NextResponse.json({ error: "UNAUTHORIZED", requestId: context.requestId }, { status: 401 });
  }

  try {
    const result = await runOutboxWorkerOnce({
      workerId: `http-${context.requestId}`,
      batchSize: Number(process.env.OUTBOX_BATCH_SIZE ?? 20),
      leaseMs: Number(process.env.OUTBOX_LEASE_MS ?? 300_000),
    });
    return NextResponse.json({ status: "ok", requestId: context.requestId, ...result });
  } catch (error) {
    structuredLog("error", "outbox_worker_request_failed", {
      request_id: context.requestId,
      correlation_id: context.correlationId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "OUTBOX_WORKER_FAILED", requestId: context.requestId }, { status: 500 });
  }
}
