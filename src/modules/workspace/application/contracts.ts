import type { ActorContext, WorkspaceContext, WorkspaceMembershipRecord } from "../domain/types";

export type WorkspaceBrandingRecord = Readonly<{
  workspaceId: string;
  displayName: string;
  logoUrl: string | null;
  accentColor: string;
  supportEmail: string | null;
  whatsapp: string | null;
}>;

export type WorkspaceModuleRecord = Readonly<{
  moduleKey: string;
  enabled: boolean;
  settings: Record<string, unknown>;
}>;

export interface WorkspaceRepository {
  findMembershipBySlug(userId: string, workspaceSlug: string): Promise<WorkspaceMembershipRecord | null>;
  findMembershipById(userId: string, workspaceId: string): Promise<WorkspaceMembershipRecord | null>;
  listMemberships(userId: string): Promise<readonly WorkspaceMembershipRecord[]>;
  countActiveOwners(workspaceId: string): Promise<number>;
  getBranding(context: WorkspaceContext): Promise<WorkspaceBrandingRecord | null>;
  listModules(context: WorkspaceContext): Promise<readonly WorkspaceModuleRecord[]>;
  writeAudit(input: {
    actor: ActorContext;
    workspace: WorkspaceContext;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
