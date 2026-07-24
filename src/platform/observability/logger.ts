export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogMetadata = Readonly<Record<string, unknown>>;

function cleanMetadata(metadata: LogMetadata) {
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
}

export function structuredLog(level: LogLevel, event: string, metadata: LogMetadata = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    service: "rizqhub",
    ...cleanMetadata(metadata),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else if (level === "debug") console.debug(entry);
  else console.info(entry);
}
