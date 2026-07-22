import { pool } from "@/lib/db";
import { configurationChecks, storageChecks } from "@/lib/runtime";

export async function GET() {
  let database = false;
  try { await pool.query("SELECT 1"); database = true; } catch { database = false; }
  const config = configurationChecks().filter((check) => check.key !== "xendit");
  const storage = await storageChecks();
  const ready = database && config.every((check) => check.ok) && storage.every((check) => check.ok);
  return Response.json({ status: ready ? "ready" : "not_ready", database, configuration: config.every((check) => check.ok), storage: storage.every((check) => check.ok) }, {
    status: ready ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
