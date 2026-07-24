import { WorkspaceAccessError } from "./errors";
import { evaluatePolicy, type PolicyRule } from "@/platform/policy/engine";
import type { WorkspaceContext, WorkspaceMembershipRole, WorkspaceMembershipStatus, WorkspacePermission } from "./types";

const permissionsByRole: Record<WorkspaceMembershipRole, readonly WorkspacePermission[]> = {
  OWNER: ["workspace.read", "workspace.manage", "workspace.members.manage", "workspace.billing.manage"],
  ADMIN: ["workspace.read", "workspace.manage", "workspace.members.manage"],
  FINANCE: ["workspace.read", "workspace.billing.manage"],
  STAFF: ["workspace.read"],
  MEMBER: ["workspace.read"],
};

const workspacePermissionRule: PolicyRule<WorkspaceContext, WorkspacePermission> = {
  name: "workspace.permission",
  evaluate: (context, permission) => {
    if (context.workspaceStatus !== "ACTIVE") return { allowed: false, reason: "WORKSPACE_NOT_ACTIVE" };
    if (context.membershipStatus !== "ACTIVE") return { allowed: false, reason: "MEMBERSHIP_NOT_ACTIVE" };
    const allowed = permissionsByRole[context.membershipRole].includes(permission);
    return { allowed, reason: allowed ? "ROLE_PERMISSION_GRANTED" : "ROLE_PERMISSION_MISSING" };
  },
};

export function hasWorkspacePermission(context: WorkspaceContext, permission: WorkspacePermission) {
  return evaluatePolicy(workspacePermissionRule, context, permission).allowed;
}

export function requireWorkspacePermission(context: WorkspaceContext, permission: WorkspacePermission) {
  if (!hasWorkspacePermission(context, permission)) {
    throw new WorkspaceAccessError(`Izin ${permission} tidak tersedia pada workspace aktif.`, "PERMISSION_DENIED");
  }
}

export function assertOwnerInvariant(input: {
  currentRole: WorkspaceMembershipRole;
  currentStatus: WorkspaceMembershipStatus;
  nextRole: WorkspaceMembershipRole;
  nextStatus: WorkspaceMembershipStatus;
  activeOwnerCount: number;
}) {
  const removesActiveOwner = input.currentRole === "OWNER"
    && input.currentStatus === "ACTIVE"
    && (input.nextRole !== "OWNER" || input.nextStatus !== "ACTIVE");

  if (removesActiveOwner && input.activeOwnerCount <= 1) {
    throw new WorkspaceAccessError("Owner aktif terakhir tidak dapat diturunkan atau dinonaktifkan.", "LAST_OWNER");
  }
}
