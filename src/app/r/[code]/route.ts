import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { affiliateClicks, affiliatePartners, affiliatePrograms, products } from "@/lib/schema";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [row] = await db.select({ partnerId: affiliatePartners.id, productId: products.id, slug: products.slug })
    .from(affiliatePartners).innerJoin(affiliatePrograms, eq(affiliatePrograms.id, affiliatePartners.programId))
    .innerJoin(products, eq(products.id, affiliatePrograms.productId))
    .where(and(eq(affiliatePartners.code, code), eq(affiliatePartners.status, "ACTIVE"), eq(affiliatePrograms.isActive, true), eq(products.status, "PUBLISHED"))).limit(1);
  if (!row) return Response.redirect(new URL("/marketplace", request.url), 302);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const agent = request.headers.get("user-agent")?.slice(0, 300) ?? "";
  const visitorHash = createHash("sha256").update(`${forwarded}:${agent}:${process.env.INTERNAL_JOB_SECRET ?? "rizqhub"}`).digest("hex");
  const [recent] = await db.select({ id: affiliateClicks.id }).from(affiliateClicks).where(and(
    eq(affiliateClicks.partnerId, row.partnerId), eq(affiliateClicks.visitorHash, visitorHash),
    gt(affiliateClicks.createdAt, new Date(Date.now() - 60 * 60_000)),
  )).limit(1);
  if (!recent) await db.insert(affiliateClicks).values({
    partnerId: row.partnerId, productId: row.productId, visitorHash,
    referer: request.headers.get("referer")?.slice(0, 500) ?? null,
  });
  const target = new URL(`/p/${row.slug}`, request.url);
  target.searchParams.set("ref", code);
  return Response.redirect(target, 302);
}
