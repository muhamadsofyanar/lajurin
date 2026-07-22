"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { drizzleWorkspaceRepository } from "@/modules/workspace/infrastructure/drizzle-workspace-repository";
import { resolveWorkspaceBySlug } from "@/modules/workspace";
import { ACTIVE_WORKSPACE_COOKIE, currentActorContext } from "@/platform/auth/workspace-context";
import { isWorkspaceCanaryUser } from "@/platform/feature-flags/workspace";

export async function setActiveWorkspaceAction(formData: FormData) {
  const actor = await currentActorContext();
  if (!isWorkspaceCanaryUser(actor.userId)) redirect("/dashboard");

  const workspaceSlug = String(formData.get("workspaceSlug") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,70}[a-z0-9]$/.test(workspaceSlug)) redirect("/dashboard");
  const workspace = await resolveWorkspaceBySlug(actor, workspaceSlug, drizzleWorkspaceRepository);

  (await cookies()).set(ACTIVE_WORKSPACE_COOKIE, workspace.workspaceSlug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(`/w/${workspace.workspaceSlug}/dashboard`);
}
