import { timingSafeEqual } from "node:crypto";
import { and, eq, inArray, lte } from "drizzle-orm";
import { dispatchOrderNotifications } from "@/lib/notifications";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";

function tokenMatches(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!tokenMatches(token, process.env.INTERNAL_JOB_SECRET)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const threshold = new Date(Date.now() - 60 * 60_000);
  const rows = await db.select({ id: orders.id }).from(orders).where(and(
    inArray(orders.status, ["PENDING", "AWAITING_CONFIRMATION"]),
    eq(orders.marketingConsent, true),
    lte(orders.createdAt, threshold),
  )).limit(100);
  await Promise.all(rows.map((row) => dispatchOrderNotifications(row.id, "CHECKOUT_REMINDER")));
  return Response.json({ ok: true, processed: rows.length }, { headers: { "cache-control": "no-store" } });
}
