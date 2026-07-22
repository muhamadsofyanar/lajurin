import { randomUUID } from "node:crypto";
import { asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLogs,
  legacyMerchantWorkspaceLinks,
  merchantProfiles,
  workspaceBranding,
  workspaceMemberships,
  workspaces,
} from "@/lib/schema";
import { normalizeWorkspaceSlug } from "../domain/validation";

export type WorkspaceBackfillResult = {
  scanned: number;
  created: number;
  skipped: number;
  failed: Array<{ merchantProfileId: string; error: string }>;
  nextCursor: string | null;
};

function workspaceStatusFromLegacy(status: "PENDING" | "ACTIVE" | "SUSPENDED") {
  if (status === "ACTIVE") return "ACTIVE" as const;
  if (status === "SUSPENDED") return "SUSPENDED" as const;
  return "DRAFT" as const;
}

export async function backfillLegacyMerchantWorkspaces(input: {
  batchSize?: number;
  afterProfileId?: string;
  requestId?: string;
} = {}): Promise<WorkspaceBackfillResult> {
  const batchSize = Math.min(Math.max(input.batchSize ?? 50, 1), 250);
  const where = input.afterProfileId ? gt(merchantProfiles.id, input.afterProfileId) : undefined;
  const merchants = await db.select({
    id: merchantProfiles.id,
    userId: merchantProfiles.userId,
    brandName: merchantProfiles.brandName,
    slug: merchantProfiles.slug,
    logoUrl: merchantProfiles.logoUrl,
    supportEmail: merchantProfiles.supportEmail,
    whatsapp: merchantProfiles.whatsapp,
    accentColor: merchantProfiles.accentColor,
    status: merchantProfiles.status,
  }).from(merchantProfiles).where(where).orderBy(asc(merchantProfiles.id)).limit(batchSize);

  const result: WorkspaceBackfillResult = {
    scanned: merchants.length,
    created: 0,
    skipped: 0,
    failed: [],
    nextCursor: merchants.at(-1)?.id ?? null,
  };
  const requestId = input.requestId ?? `workspace-backfill-${randomUUID()}`;

  for (const merchant of merchants) {
    try {
      const outcome = await db.transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${merchant.id}))`);
        const [existingLink] = await tx.select({ id: legacyMerchantWorkspaceLinks.id })
          .from(legacyMerchantWorkspaceLinks)
          .where(eq(legacyMerchantWorkspaceLinks.merchantProfileId, merchant.id)).limit(1);
        if (existingLink) return "skipped" as const;

        const baseSlug = normalizeWorkspaceSlug(merchant.slug || merchant.brandName, merchant.id);
        const [slugOwner] = await tx.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, baseSlug)).limit(1);
        const suffix = merchant.id.replaceAll("-", "").slice(0, 8);
        const slug = slugOwner ? `${baseSlug.slice(0, Math.max(2, 71 - suffix.length))}-${suffix}` : baseSlug;

        const [workspace] = await tx.insert(workspaces).values({
          name: merchant.brandName.trim().slice(0, 120),
          slug,
          kind: "EXTERNAL",
          status: workspaceStatusFromLegacy(merchant.status),
          createdBy: merchant.userId,
        }).returning({ id: workspaces.id });

        await tx.insert(workspaceMemberships).values({
          workspaceId: workspace.id,
          userId: merchant.userId,
          role: "OWNER",
          status: "ACTIVE",
        });
        await tx.insert(workspaceBranding).values({
          workspaceId: workspace.id,
          displayName: merchant.brandName,
          logoUrl: merchant.logoUrl,
          accentColor: merchant.accentColor,
          supportEmail: merchant.supportEmail,
          whatsapp: merchant.whatsapp,
        });
        await tx.insert(legacyMerchantWorkspaceLinks).values({
          merchantProfileId: merchant.id,
          legacyMerchantUserId: merchant.userId,
          workspaceId: workspace.id,
        });
        await tx.insert(auditLogs).values({
          workspaceId: workspace.id,
          requestId,
          action: "WORKSPACE_BACKFILLED",
          entityType: "workspace",
          entityId: workspace.id,
          metadata: { source: "merchant_profile", schemaVersion: 1 },
        });
        return "created" as const;
      });
      result[outcome] += 1;
    } catch (error) {
      result.failed.push({
        merchantProfileId: merchant.id,
        error: error instanceof Error ? error.message : "Unknown backfill error",
      });
    }
  }

  return result;
}
