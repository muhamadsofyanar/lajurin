import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { legacyMerchantWorkspaceLinks, workspaceMemberships, workspaces } from "@/lib/schema";
import { requireWorkspacePermission } from "@/modules/workspace/domain/policy";
import type { WorkspacePermission } from "@/modules/workspace/domain/types";

export async function requireMerchantWorkspace(permission: WorkspacePermission = "workspace.read") {
  const merchant = await requireMerchant();
  await requireFeature("WORKSPACE_TEAMS", merchant.id);
  const [row] = await db.select({ workspace: workspaces, membership: workspaceMemberships })
    .from(legacyMerchantWorkspaceLinks)
    .innerJoin(workspaces, eq(workspaces.id, legacyMerchantWorkspaceLinks.workspaceId))
    .innerJoin(workspaceMemberships, and(
      eq(workspaceMemberships.workspaceId, workspaces.id),
      eq(workspaceMemberships.userId, merchant.id),
    ))
    .where(eq(legacyMerchantWorkspaceLinks.legacyMerchantUserId, merchant.id)).limit(1);
  if (!row) redirect("/dashboard?error=Workspace+merchant+belum+tersedia");
  const context = {
    workspaceId: row.workspace.id,
    workspaceSlug: row.workspace.slug,
    workspaceStatus: row.workspace.status,
    membershipId: row.membership.id,
    membershipRole: row.membership.role,
    membershipStatus: row.membership.status,
  } as const;
  requireWorkspacePermission(context, permission);
  return { merchant, workspace: row.workspace, membership: row.membership, context };
}
