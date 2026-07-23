import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { drizzleWorkspaceRepository } from "@/modules/workspace/infrastructure/drizzle-workspace-repository";
import { listAvailableWorkspaces, resolveWorkspaceBySlug, type ActorContext } from "@/modules/workspace";

export const ACTIVE_WORKSPACE_COOKIE = "rizqhub_active_workspace";
const LEGACY_ACTIVE_WORKSPACE_COOKIE = "lajurin_active_workspace";

export async function currentActorContext(): Promise<ActorContext> {
  const user = await requireUser();
  const requestHeaders = await headers();
  return Object.freeze({
    userId: user.id,
    platformRole: user.role,
    requestId: requestHeaders.get("x-request-id") ?? randomUUID(),
  });
}

export async function resolveCurrentWorkspace(explicitWorkspaceSlug?: string) {
  const actor = await currentActorContext();
  let workspaceSlug = explicitWorkspaceSlug;

  if (!workspaceSlug) {
    const cookieStore = await cookies();
    workspaceSlug = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value
      ?? cookieStore.get(LEGACY_ACTIVE_WORKSPACE_COOKIE)?.value;
  }
  if (!workspaceSlug) {
    const available = await listAvailableWorkspaces(actor, drizzleWorkspaceRepository);
    if (available.length === 1) workspaceSlug = available[0].workspaceSlug;
  }
  if (!workspaceSlug) return { actor, workspace: null } as const;

  const workspace = await resolveWorkspaceBySlug(actor, workspaceSlug, drizzleWorkspaceRepository);
  return { actor, workspace } as const;
}
