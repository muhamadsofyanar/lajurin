import { cookies } from "next/headers";
import { setActiveWorkspaceAction } from "@/app/actions/workspace";
import { drizzleWorkspaceRepository } from "../infrastructure/drizzle-workspace-repository";
import { listAvailableWorkspaces } from "../application/workspace-service";
import { ACTIVE_WORKSPACE_COOKIE, currentActorContext } from "@/platform/auth/workspace-context";
import { isWorkspaceCanaryUser } from "@/platform/feature-flags/workspace";

export async function WorkspaceSwitcher({ userId }: { userId: string }) {
  if (!isWorkspaceCanaryUser(userId)) return null;
  const actor = await currentActorContext();
  const workspaces = await listAvailableWorkspaces(actor, drizzleWorkspaceRepository);
  if (workspaces.length < 2) return null;
  const activeSlug = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;

  return <section>
    <span className="nav-section-label">Workspace aktif</span>
    {workspaces.map((workspace) => <form action={setActiveWorkspaceAction} key={workspace.workspaceId}>
      <input name="workspaceSlug" type="hidden" value={workspace.workspaceSlug} />
      <button className="nav-menu-link nav-workspace-option" type="submit">
        <span>{workspace.workspaceName}</span>
        {activeSlug === workspace.workspaceSlug && <small>Aktif</small>}
      </button>
    </form>)}
  </section>;
}
