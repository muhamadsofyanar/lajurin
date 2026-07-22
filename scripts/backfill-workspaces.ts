import { randomUUID } from "node:crypto";
import { backfillLegacyMerchantWorkspaces } from "../src/modules/workspace/infrastructure/backfill-legacy-merchants";
import { pool } from "../src/lib/db";

const batchSize = Number.parseInt(process.env.WORKSPACE_BACKFILL_BATCH_SIZE ?? "50", 10);
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 250) {
  throw new Error("WORKSPACE_BACKFILL_BATCH_SIZE harus berupa angka 1 sampai 250.");
}

const requestId = `workspace-backfill-${randomUUID()}`;
let cursor: string | undefined;
let scanned = 0;
let created = 0;
let skipped = 0;
const failures: Array<{ merchantProfileId: string; error: string }> = [];

try {
  while (true) {
    const batch = await backfillLegacyMerchantWorkspaces({ batchSize, afterProfileId: cursor, requestId });
    scanned += batch.scanned;
    created += batch.created;
    skipped += batch.skipped;
    failures.push(...batch.failed);
    console.info(JSON.stringify({ level: "info", event: "workspace_backfill_batch", requestId, ...batch }));
    if (batch.scanned < batchSize || !batch.nextCursor) break;
    cursor = batch.nextCursor;
  }

  console.info(JSON.stringify({ level: failures.length ? "error" : "info", event: "workspace_backfill_complete", requestId, scanned, created, skipped, failed: failures.length }));
  if (failures.length) process.exitCode = 1;
} finally {
  await pool.end();
}
