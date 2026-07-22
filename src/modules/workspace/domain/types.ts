export type PlatformRole = "ADMIN" | "MERCHANT" | "MEMBER";
export type WorkspaceKind = "INTERNAL" | "EXTERNAL";
export type WorkspaceStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "CLOSED";
export type WorkspaceMembershipRole = "OWNER" | "ADMIN" | "FINANCE" | "STAFF" | "MEMBER";
export type WorkspaceMembershipStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "REVOKED";

export type WorkspacePermission =
  | "workspace.read"
  | "workspace.manage"
  | "workspace.members.manage"
  | "workspace.billing.manage";

export type ActorContext = Readonly<{
  userId: string;
  platformRole: PlatformRole;
  requestId: string;
}>;

export type WorkspaceContext = Readonly<{
  workspaceId: string;
  workspaceSlug: string;
  workspaceStatus: WorkspaceStatus;
  membershipId: string;
  membershipRole: WorkspaceMembershipRole;
  membershipStatus: WorkspaceMembershipStatus;
}>;

export type WorkspaceMembershipRecord = Readonly<{
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceKind: WorkspaceKind;
  workspaceStatus: WorkspaceStatus;
  membershipId: string;
  membershipRole: WorkspaceMembershipRole;
  membershipStatus: WorkspaceMembershipStatus;
}>;
