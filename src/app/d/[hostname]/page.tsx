import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { legacyMerchantWorkspaceLinks, merchantProfiles, workspaceDomains } from "@/lib/schema";

export default async function CustomDomainEntry({ params }: { params: Promise<{ hostname: string }> }) {
  const { hostname } = await params;
  const [domain] = await db.select({ slug: merchantProfiles.slug }).from(workspaceDomains)
    .innerJoin(legacyMerchantWorkspaceLinks, eq(legacyMerchantWorkspaceLinks.workspaceId, workspaceDomains.workspaceId))
    .innerJoin(merchantProfiles, eq(merchantProfiles.id, legacyMerchantWorkspaceLinks.merchantProfileId))
    .where(and(eq(workspaceDomains.hostname, hostname.toLowerCase()), eq(workspaceDomains.status, "VERIFIED"), eq(merchantProfiles.status, "ACTIVE"))).limit(1);
  if (!domain) notFound();
  redirect(`/m/${domain.slug}`);
}
