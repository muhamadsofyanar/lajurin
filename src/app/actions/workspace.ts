"use server";

import { cookies } from "next/headers";
import { and, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireMerchantWorkspace } from "@/lib/merchant-workspace";
import { auditLogs, users, workspaceMemberships } from "@/lib/schema";
import { assertOwnerInvariant } from "@/modules/workspace/domain/policy";
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

const teamRoleSchema = z.enum(["OWNER", "ADMIN", "FINANCE", "STAFF"]);

export async function addWorkspaceMemberAction(formData: FormData) {
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.members.manage");
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(255), role: teamRoleSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/dashboard/team?error=Email+atau+peran+tidak+valid");
  const [target] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!target || target.role === "ADMIN") redirect("/dashboard/team?error=Pengguna+harus+sudah+terdaftar+dan+bukan+admin+platform");

  await db.transaction(async (tx) => {
    await tx.insert(workspaceMemberships).values({ workspaceId: workspace.id, userId: target.id, role: parsed.data.role, status: "ACTIVE" })
      .onConflictDoUpdate({ target: [workspaceMemberships.workspaceId, workspaceMemberships.userId], set: { role: parsed.data.role, status: "ACTIVE", updatedAt: new Date() } });
    await tx.insert(auditLogs).values({ actorId: merchant.id, workspaceId: workspace.id, action: "WORKSPACE_MEMBER_ADDED", entityType: "USER", entityId: target.id, metadata: { role: parsed.data.role } });
  });
  revalidatePath("/dashboard/team");
  redirect("/dashboard/team?success=Anggota+workspace+berhasil+ditambahkan");
}

export async function updateWorkspaceMemberAction(membershipId: string, formData: FormData) {
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.members.manage");
  const parsed = z.object({ role: teamRoleSchema, status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || !z.string().uuid().safeParse(membershipId).success) redirect("/dashboard/team?error=Perubahan+anggota+tidak+valid");

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`workspace-members:${workspace.id}`}))`);
      const [current] = await tx.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.id, membershipId), eq(workspaceMemberships.workspaceId, workspace.id))).limit(1);
      if (!current) throw new Error("MEMBER_NOT_FOUND");
      const [{ value: activeOwnerCount }] = await tx.select({ value: count() }).from(workspaceMemberships).where(and(eq(workspaceMemberships.workspaceId, workspace.id), eq(workspaceMemberships.role, "OWNER"), eq(workspaceMemberships.status, "ACTIVE")));
      assertOwnerInvariant({ currentRole: current.role, currentStatus: current.status, nextRole: parsed.data.role, nextStatus: parsed.data.status, activeOwnerCount });
      if (current.userId === merchant.id && parsed.data.status !== "ACTIVE") throw new Error("SELF_DEACTIVATE");
      await tx.update(workspaceMemberships).set({ role: parsed.data.role, status: parsed.data.status, updatedAt: new Date() }).where(eq(workspaceMemberships.id, current.id));
      await tx.insert(auditLogs).values({ actorId: merchant.id, workspaceId: workspace.id, action: "WORKSPACE_MEMBER_UPDATED", entityType: "WORKSPACE_MEMBERSHIP", entityId: current.id, metadata: { role: parsed.data.role, status: parsed.data.status } });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "MEMBER_NOT_FOUND") redirect("/dashboard/team?error=Anggota+tidak+ditemukan");
    if (message === "SELF_DEACTIVATE") redirect("/dashboard/team?error=Akun+aktif+Anda+tidak+dapat+dinonaktifkan+sendiri");
    if (message.includes("Owner aktif terakhir")) redirect("/dashboard/team?error=Owner+aktif+terakhir+tidak+dapat+diubah");
    throw error;
  }
  revalidatePath("/dashboard/team");
  redirect("/dashboard/team?success=Peran+anggota+berhasil+diperbarui");
}
