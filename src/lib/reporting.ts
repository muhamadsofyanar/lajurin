export type ReportPeriod = "7" | "30" | "90" | "all";

export function reportPeriodStart(period: ReportPeriod, now = new Date()) {
  if (period === "all") return null;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - Number(period));
  return start;
}

export function safeCsvCell(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  const protectedValue = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replaceAll('"', '""')}"`;
}
