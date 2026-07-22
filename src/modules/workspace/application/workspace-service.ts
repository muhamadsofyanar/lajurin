import { WorkspaceAccessError } from "../domain/errors";
import type { ActorContext, WorkspaceContext, WorkspaceMembershipRecord } from "../domain/types";
import type { WorkspaceRepository } from "./contracts";

function toContext(record: WorkspaceMembershipRecord): WorkspaceContext {
  if (record.membershipStatus !== "ACTIVE") {
    throw new WorkspaceAccessError("Membership workspace tidak aktif.", "MEMBERSHIP_INACTIVE");
  }
  if (record.workspaceStatus !== "ACTIVE") {
    throw new WorkspaceAccessError("Workspace tidak aktif.", "WORKSPACE_INACTIVE");
  }
  return Object.freeze({
    workspaceId: record.workspaceId,
    workspaceSlug: record.workspaceSlug,
    workspaceStatus: record.workspaceStatus,
    membershipId: record.membershipId,
    membershipRole: record.membershipRole,
    membershipStatus: record.membershipStatus,
  });
}

export async function resolveWorkspaceBySlug(
  actor: ActorContext,
  workspaceSlug: string,
  repository: WorkspaceRepository,
) {
  const membership = await repository.findMembershipBySlug(actor.userId, workspaceSlug);
  if (!membership) throw new WorkspaceAccessError("Workspace tidak ditemukan untuk user ini.", "WORKSPACE_NOT_FOUND");
  return toContext(membership);
}

export async function resolveWorkspaceById(
  actor: ActorContext,
  workspaceId: string,
  repository: WorkspaceRepository,
) {
  const membership = await repository.findMembershipById(actor.userId, workspaceId);
  if (!membership) throw new WorkspaceAccessError("Workspace tidak ditemukan untuk user ini.", "WORKSPACE_NOT_FOUND");
  return toContext(membership);
}

export async function listAvailableWorkspaces(actor: ActorContext, repository: WorkspaceRepository) {
  const memberships = await repository.listMemberships(actor.userId);
  return memberships.filter((item) => item.membershipStatus === "ACTIVE" && item.workspaceStatus === "ACTIVE");
}
