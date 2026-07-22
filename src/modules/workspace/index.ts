export type { WorkspaceRepository } from "./application/contracts";
export { listAvailableWorkspaces, resolveWorkspaceById, resolveWorkspaceBySlug } from "./application/workspace-service";
export { WorkspaceAccessError } from "./domain/errors";
export { assertOwnerInvariant, hasWorkspacePermission, requireWorkspacePermission } from "./domain/policy";
export type {
  ActorContext,
  WorkspaceContext,
  WorkspaceMembershipRecord,
  WorkspaceMembershipRole,
  WorkspacePermission,
} from "./domain/types";
export { normalizeHostname, normalizeWorkspaceSlug, validateModuleSettings, workspaceModuleKeys } from "./domain/validation";
