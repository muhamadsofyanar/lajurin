export class WorkspaceAccessError extends Error {
  constructor(
    message: string,
    readonly code:
      | "WORKSPACE_NOT_FOUND"
      | "WORKSPACE_INACTIVE"
      | "MEMBERSHIP_INACTIVE"
      | "PERMISSION_DENIED"
      | "LAST_OWNER",
  ) {
    super(message);
    this.name = "WorkspaceAccessError";
  }
}
