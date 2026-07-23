import { logEvent } from "@/lib/security";

export function registerProcessMonitoring() {
  const marker = globalThis as typeof globalThis & { __lajurinProcessMonitoring?: boolean };
  if (marker.__lajurinProcessMonitoring) return;
  process.on("uncaughtExceptionMonitor", (error) => {
    logEvent("error", "uncaught_exception", { name: error.name, message: error.message.slice(0, 500) });
  });
  process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logEvent("error", "unhandled_rejection", { name: error.name, message: error.message.slice(0, 500) });
  });
  marker.__lajurinProcessMonitoring = true;
}
