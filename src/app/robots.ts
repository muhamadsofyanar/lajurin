import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "https://rizqhub.id").replace(/\/$/, "");
  return { rules: { userAgent: "*", allow: ["/", "/marketplace", "/filosofi", "/p/", "/m/"], disallow: ["/admin", "/dashboard", "/member", "/api"] }, sitemap: `${base}/sitemap.xml` };
}
