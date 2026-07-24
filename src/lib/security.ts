import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { pool } from "@/lib/db";
import { structuredLog } from "@/platform/observability/logger";

export type RateLimitRule = { limit: number; windowMs: number; blockMs: number };

export function requestIdFromHeaders(input: Headers) {
  const supplied = input.get("x-request-id")?.trim();
  return supplied && /^[a-zA-Z0-9._:-]{1,100}$/.test(supplied) ? supplied : randomUUID();
}

export function clientAddressFromHeaders(input: Headers) {
  const forwarded = input.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || input.get("x-real-ip")?.trim() || "unknown";
}

export function privacyHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function currentRequestIdentity(scope: string, discriminator = "") {
  const requestHeaders = await headers();
  const address = clientAddressFromHeaders(requestHeaders);
  return `${scope}:${privacyHash(`${address}:${discriminator.toLowerCase().trim()}`)}`;
}

export async function enforceRateLimit(key: string, rule: RateLimitRule) {
  const now = new Date();
  const windowBoundary = new Date(now.getTime() - rule.windowMs);
  const blockUntil = new Date(now.getTime() + rule.blockMs);
  const result = await pool.query<{ count: number; blocked_until: Date | null }>(
    `INSERT INTO rate_limits (key, count, window_started_at, blocked_until, updated_at)
     VALUES ($1, 1, $2, NULL, $2)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_started_at < $3 THEN 1 ELSE rate_limits.count + 1 END,
       window_started_at = CASE WHEN rate_limits.window_started_at < $3 THEN $2 ELSE rate_limits.window_started_at END,
       blocked_until = CASE
         WHEN rate_limits.blocked_until > $2 THEN rate_limits.blocked_until
         WHEN (CASE WHEN rate_limits.window_started_at < $3 THEN 1 ELSE rate_limits.count + 1 END) > $4 THEN $5
         ELSE NULL
       END,
       updated_at = $2
     RETURNING count, blocked_until`,
    [key, now, windowBoundary, rule.limit, blockUntil],
  );
  const record = result.rows[0];
  const limited = Boolean(record.blocked_until && record.blocked_until.getTime() > now.getTime());
  return { limited, retryAfterSeconds: limited ? Math.max(1, Math.ceil((record.blocked_until!.getTime() - now.getTime()) / 1000)) : 0 };
}

export async function clearRateLimit(key: string) {
  await pool.query("DELETE FROM rate_limits WHERE key = $1", [key]);
}

export function verifyUploadSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "application/pdf") return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  return true;
}

export function logEvent(level: "info" | "warn" | "error", event: string, metadata: Record<string, unknown> = {}) {
  structuredLog(level, event, metadata);
}
