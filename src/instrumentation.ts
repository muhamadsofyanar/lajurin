export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { configurationChecks } = await import("@/lib/runtime");
  const { logEvent } = await import("@/lib/security");
  const failed = configurationChecks().filter((check) => !check.ok && check.key !== "xendit");
  if (failed.length) logEvent("warn", "runtime_configuration_incomplete", { failed: failed.map((check) => check.key) });
}
