import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, workspaceBranding, workspaceMemberships, workspaceModules, workspaces } from "@/lib/schema";
import type { WorkspaceRepository } from "../application/contracts";
import type { WorkspaceMembershipRecord } from "../domain/types";

const membershipSelection = {
  workspaceId: workspaces.id,
  workspaceName: workspaces.name,
  workspaceSlug: workspaces.slug,
  workspaceKind: workspaces.kind,
  workspaceStatus: workspaces.status,
  membershipId: workspaceMemberships.id,
  membershipRole: workspaceMemberships.role,
  membershipStatus: workspaceMemberships.status,
};

export const drizzleWorkspaceRepository: WorkspaceRepository = {
  async findMembershipBySlug(userId, workspaceSlug) {
    const [record] = await db.select(membershipSelection).from(workspaceMemberships)
      .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.id))
      .where(and(eq(workspaceMemberships.userId, userId), eq(workspaces.slug, workspaceSlug))).limit(1);
    return (record as WorkspaceMembershipRecord | undefined) ?? null;
  },

  async findMembershipById(userId, workspaceId) {
    const [record] = await db.select(membershipSelection).from(workspaceMemberships)
      .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.id))
      .where(and(eq(workspaceMemberships.userId, userId), eq(workspaces.id, workspaceId))).limit(1);
    return (record as WorkspaceMembershipRecord | undefined) ?? null;
  },

  async listMemberships(userId) {
    const records = await db.select(membershipSelection).from(workspaceMemberships)
      .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.id))
      .where(eq(workspaceMemberships.userId, userId));
    return records as WorkspaceMembershipRecord[];
  },

  async countActiveOwners(workspaceId) {
    const [{ value }] = await db.select({ value: count() }).from(workspaceMemberships).where(and(
      eq(workspaceMemberships.workspaceId, workspaceId),
      eq(workspaceMemberships.role, "OWNER"),
      eq(workspaceMemberships.status, "ACTIVE"),
    ));
    return value;
  },

  async getBranding(context) {
    const [record] = await db.select({
      workspaceId: workspaceBranding.workspaceId,
      displayName: workspaceBranding.displayName,
      logoUrl: workspaceBranding.logoUrl,
      accentColor: workspaceBranding.accentColor,
      supportEmail: workspaceBranding.supportEmail,
      whatsapp: workspaceBranding.whatsapp,
    }).from(workspaceBranding).where(eq(workspaceBranding.workspaceId, context.workspaceId)).limit(1);
    return record ?? null;
  },

  async listModules(context) {
    return db.select({
      moduleKey: workspaceModules.moduleKey,
      enabled: workspaceModules.enabled,
      settings: workspaceModules.settings,
    }).from(workspaceModules).where(eq(workspaceModules.workspaceId, context.workspaceId));
  },

  async writeAudit({ actor, workspace, action, entityType, entityId, metadata }) {
    await db.insert(auditLogs).values({
      actorId: actor.userId,
      workspaceId: workspace.workspaceId,
      requestId: actor.requestId,
      action,
      entityType,
      entityId,
      metadata,
    });
  },
};
