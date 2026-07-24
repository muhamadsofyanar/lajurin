import { logEvent, requestIdFromHeaders } from "@/lib/security";
import { runOutboxWorker } from "@/platform/events/worker";
import { bearerTokenFromRequest, internalJobTokenMatches } from "@/platform/security/internal-job";

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  if (!internalJobTokenMatches(bearerTokenFromRequest(request))) {
    logEvent("warn", "outbox_worker_unauthorized", { requestId });
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: { "cache-control": "no-store", "x-request-id": requestId },
    });
  }

  try {
    const result = await runOutboxWorker({
      limit: Number(process.env.OUTBOX_BATCH_SIZE ?? 20),
      correlationId: requestId,
      requestedBy: "coolify-scheduler",
    });
    logEvent("info", "outbox_worker_processed", { requestId, ...result });
    return Response.json({ ok: true, ...result }, {
      headers: { "cache-control": "no-store", "x-request-id": requestId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown worker error";
    logEvent("error", "outbox_worker_failed", { requestId, error: message });
    return Response.json({ error: "Worker failed" }, {
      status: 500,
      headers: { "cache-control": "no-store", "x-request-id": requestId },
    });
  }
}
