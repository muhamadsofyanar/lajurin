import { pool } from "../src/lib/db";
import { runOutboxWorkerOnce } from "../src/platform/jobs/outbox-worker";
import { structuredLog } from "../src/platform/observability/logger";

const watch = process.argv.includes("--watch");
const intervalMs = Math.max(1_000, Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 5_000));
let stopping = false;

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

async function iteration() {
  const result = await runOutboxWorkerOnce({
    batchSize: Number(process.env.OUTBOX_BATCH_SIZE ?? 20),
    leaseMs: Number(process.env.OUTBOX_LEASE_MS ?? 300_000),
  });
  structuredLog("info", "outbox_worker_iteration", { ...result });
}

try {
  do {
    await iteration();
    if (!watch || stopping) break;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  } while (!stopping);
} catch (error) {
  structuredLog("error", "outbox_worker_crashed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
} finally {
  await pool.end();
}
