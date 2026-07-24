import { z } from "zod";
import { logEvent, requestIdFromHeaders } from "@/lib/security";
import { replayDeadLetterEvent } from "@/platform/events/worker";
import { bearerTokenFromRequest, internalJobTokenMatches } from "@/platform/security/internal-job";

const replaySchema = z.object({ eventId: z.string().uuid() }).strict();

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  if (!internalJobTokenMatches(bearerTokenFromRequest(request))) {
    logEvent("warn", "outbox_replay_unauthorized", { requestId });
    return Response.json({ error: "Unauthorized" }, {
      status: 401,
      headers: { "cache-control": "no-store", "x-request-id": requestId },
    });
  }

  const body = replaySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "eventId tidak valid" }, {
      status: 422,
      headers: { "cache-control": "no-store", "x-request-id": requestId },
    });
  }
  const replayed = await replayDeadLetterEvent(body.data.eventId, "internal-job");
  logEvent("info", "outbox_event_replay", { requestId, eventId: body.data.eventId, replayed });
  return Response.json({ ok: replayed, eventId: body.data.eventId }, {
    status: replayed ? 200 : 404,
    headers: { "cache-control": "no-store", "x-request-id": requestId },
  });
}
