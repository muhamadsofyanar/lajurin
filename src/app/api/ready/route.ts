import { pool } from "@/lib/db";
import { configurationChecks, storageChecks } from "@/lib/runtime";

export async function GET() {
  let database = false;
  let platformKernel = false;
  try {
    const result = await pool.query<{ platform_kernel: boolean }>(
      `SELECT to_regclass('public.outbox_events') IS NOT NULL
        AND to_regclass('public.job_runs') IS NOT NULL AS platform_kernel`,
    );
    database = true;
    platformKernel = result.rows[0]?.platform_kernel === true;
  } catch {
    database = false;
    platformKernel = false;
  }
  const config = configurationChecks().filter((check) => check.key !== "xendit");
  const storage = await storageChecks();
  const configuration = config.every((check) => check.ok);
  const storageReady = storage.every((check) => check.ok);
  const ready = database && platformKernel && configuration && storageReady;
  return Response.json({
    status: ready ? "ready" : "not_ready",
    database,
    platformKernel,
    configuration,
    storage: storageReady,
  }, {
    status: ready ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
