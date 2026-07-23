import { timingSafeEqual } from "node:crypto";
import { processBroadcastQueue, recoverStaleBroadcastClaims } from "@/lib/broadcasts";
import { logEvent, requestIdFromHeaders } from "@/lib/security";

function tokenMatches(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!tokenMatches(token, process.env.INTERNAL_JOB_SECRET)) {
    logEvent("warn", "broadcast_job_unauthorized", { requestId });
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "x-request-id": requestId } });
  }
  const recovered = await recoverStaleBroadcastClaims();
  const result = await processBroadcastQueue();
  logEvent("info", "broadcast_job_processed", { requestId, recovered, ...result });
  return Response.json({ ok: true, recovered, ...result }, {
    headers: { "cache-control": "no-store", "x-request-id": requestId },
  });
}
