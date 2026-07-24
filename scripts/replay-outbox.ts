import { pool } from "../src/lib/db";
import { replayDeadLetterEvent } from "../src/platform/jobs/outbox-worker";

const eventId = process.argv[2];
const actorId = process.argv[3] ?? null;
if (!eventId || !/^[0-9a-f-]{36}$/i.test(eventId)) {
  console.error("Usage: npm run outbox:replay -- <event-uuid> [actor-uuid]");
  process.exit(1);
}

try {
  await replayDeadLetterEvent({ eventId, actorId });
  console.info(JSON.stringify({ level: "info", event: "outbox_event_replayed", eventId, actorId }));
} finally {
  await pool.end();
}
