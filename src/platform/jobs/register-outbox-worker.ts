import { runOutboxWorkerOnce } from "./outbox-worker";
import { structuredLog } from "@/platform/observability/logger";

type WorkerMarker = typeof globalThis & {
  __rizqhubOutboxWorker?: {
    timer: NodeJS.Timeout;
    running: boolean;
  };
};

function workerEnabled() {
  if (process.env.NEXT_PHASE === "phase-production-build") return false;
  const configured = process.env.OUTBOX_WORKER_ENABLED?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function registerOutboxWorker() {
  if (!workerEnabled()) return;
  const marker = globalThis as WorkerMarker;
  if (marker.__rizqhubOutboxWorker) return;

  const configuredInterval = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 5_000);
  const intervalMs = Number.isFinite(configuredInterval) ? Math.max(1_000, configuredInterval) : 5_000;
  const state = { timer: undefined as unknown as NodeJS.Timeout, running: false };

  const tick = async () => {
    if (state.running) return;
    state.running = true;
    try {
      const result = await runOutboxWorkerOnce({
        batchSize: Number(process.env.OUTBOX_BATCH_SIZE ?? 20),
        leaseMs: Number(process.env.OUTBOX_LEASE_MS ?? 300_000),
      });
      if (result.claimed > 0) structuredLog("info", "embedded_outbox_worker_iteration", { ...result });
    } catch (error) {
      structuredLog("error", "embedded_outbox_worker_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      state.running = false;
    }
  };

  state.timer = setInterval(() => { void tick(); }, intervalMs);
  state.timer.unref();
  marker.__rizqhubOutboxWorker = state;
  setTimeout(() => { void tick(); }, 1_000).unref();

  structuredLog("info", "embedded_outbox_worker_registered", { interval_ms: intervalMs });
}
