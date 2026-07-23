import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { merchantProfiles, products } from "@/lib/schema";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "https://rizqhub.id").replace(/\/$/, "");
  const rows = await db.select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId)).where(and(eq(products.status, "PUBLISHED"), eq(merchantProfiles.status, "ACTIVE")));
  return [{ url: base, changeFrequency: "weekly", priority: 1 }, { url: `${base}/marketplace`, changeFrequency: "daily", priority: 0.9 }, ...rows.map((row) => ({ url: `${base}/p/${row.slug}`, lastModified: row.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 }))];
}
