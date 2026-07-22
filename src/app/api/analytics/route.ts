import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsEvents, merchantProfiles, products } from "@/lib/schema";
import { clientAddressFromHeaders, enforceRateLimit, privacyHash } from "@/lib/security";

const payloadSchema = z.object({
  productId: z.string().uuid(),
  visitorId: z.string().min(8).max(100).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 4096) return Response.json({ error: "Payload too large" }, { status: 413 });
  const identity = `analytics:${privacyHash(clientAddressFromHeaders(request.headers))}`;
  const rateLimit = await enforceRateLimit(identity, { limit: 60, windowMs: 60_000, blockMs: 5 * 60_000 });
  if (rateLimit.limited) return Response.json({ error: "Too many events" }, { status: 429, headers: { "retry-after": String(rateLimit.retryAfterSeconds) } });
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid event" }, { status: 400 });
  const [product] = await db.select({ id: products.id }).from(products).innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId)).where(and(eq(products.id, parsed.data.productId), eq(products.status, "PUBLISHED"), eq(merchantProfiles.status, "ACTIVE"))).limit(1);
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
  await db.insert(analyticsEvents).values({ productId: parsed.data.productId, event: "PAGE_VIEW", visitorId: parsed.data.visitorId ?? null, utmSource: parsed.data.utmSource || null, utmMedium: parsed.data.utmMedium || null, utmCampaign: parsed.data.utmCampaign || null });
  return Response.json({ received: true });
}
