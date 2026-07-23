"use server";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, getCurrentUser, hashPassword, userHome } from "@/lib/auth";
import { requireMerchantWorkspace } from "@/lib/merchant-workspace";
import { auditLogs, users, workspaceInvitations, workspaceMemberships, workspaces } from "@/lib/schema";
import { getNotificationConfig, sendExternalNotification } from "@/lib/notifications";
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

function invitationTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type TeamInviteState = { ok: boolean; message: string; inviteUrl?: string };

export async function createWorkspaceInvitationAction(_state: TeamInviteState, formData: FormData): Promise<TeamInviteState> {
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.members.manage");
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(255), role: teamRoleSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Email atau peran tidak valid." };
  if (parsed.data.email === merchant.email) return { ok: false, message: "Owner sudah menjadi anggota aktif workspace." };

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  await db.transaction(async (tx) => {
    await tx.update(workspaceInvitations).set({ status: "REVOKED", updatedAt: new Date() }).where(and(
      eq(workspaceInvitations.workspaceId, workspace.id), eq(workspaceInvitations.email, parsed.data.email), eq(workspaceInvitations.status, "PENDING"),
    ));
    const [invitation] = await tx.insert(workspaceInvitations).values({
      workspaceId: workspace.id, email: parsed.data.email, role: parsed.data.role,
      tokenHash: invitationTokenHash(token), invitedBy: merchant.actorId, expiresAt,
    }).returning({ id: workspaceInvitations.id });
    await tx.insert(auditLogs).values({ actorId: merchant.actorId, workspaceId: workspace.id, action: "WORKSPACE_INVITATION_CREATED", entityType: "WORKSPACE_INVITATION", entityId: invitation.id, metadata: { email: parsed.data.email, role: parsed.data.role } });
  });
  const inviteUrl = `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/team/invite/${token}`;
  const config = getNotificationConfig();
  let delivered = false;
  if (config.mailketingActive) {
    delivered = await sendExternalNotification({
      channel: "EMAIL", recipient: parsed.data.email, subject: `Undangan tim ${workspace.name}`,
      text: `Anda diundang bergabung sebagai ${parsed.data.role} di workspace ${workspace.name}. Undangan berlaku 7 hari.`,
      actionUrl: inviteUrl, actionLabel: "Terima undangan",
    }).then(() => true).catch(() => false);
  }
  revalidatePath("/dashboard/team");
  return { ok: true, message: delivered ? "Undangan dikirim melalui email." : "Undangan dibuat. Salin tautan dan kirim ke anggota.", inviteUrl };
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
      if (current.userId === merchant.actorId && parsed.data.status !== "ACTIVE") throw new Error("SELF_DEACTIVATE");
      await tx.update(workspaceMemberships).set({ role: parsed.data.role, status: parsed.data.status, updatedAt: new Date() }).where(eq(workspaceMemberships.id, current.id));
      await tx.insert(auditLogs).values({ actorId: merchant.actorId, workspaceId: workspace.id, action: "WORKSPACE_MEMBER_UPDATED", entityType: "WORKSPACE_MEMBERSHIP", entityId: current.id, metadata: { role: parsed.data.role, status: parsed.data.status } });
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

export async function removeWorkspaceMemberAction(membershipId: string) {
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.members.manage");
  if (!z.string().uuid().safeParse(membershipId).success) redirect("/dashboard/team?error=Anggota+tidak+valid");
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`workspace-members:${workspace.id}`}))`);
    const [current] = await tx.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.id, membershipId), eq(workspaceMemberships.workspaceId, workspace.id))).limit(1);
    if (!current) return;
    if (current.userId === merchant.actorId) throw new Error("SELF_REMOVE");
    const [{ value: activeOwnerCount }] = await tx.select({ value: count() }).from(workspaceMemberships).where(and(eq(workspaceMemberships.workspaceId, workspace.id), eq(workspaceMemberships.role, "OWNER"), eq(workspaceMemberships.status, "ACTIVE")));
    assertOwnerInvariant({ currentRole: current.role, currentStatus: current.status, nextRole: current.role, nextStatus: "REVOKED", activeOwnerCount });
    await tx.delete(workspaceMemberships).where(eq(workspaceMemberships.id, current.id));
    await tx.insert(auditLogs).values({ actorId: merchant.actorId, workspaceId: workspace.id, action: "WORKSPACE_MEMBER_REMOVED", entityType: "USER", entityId: current.userId });
  }).catch((error) => {
    if (error instanceof Error && error.message === "SELF_REMOVE") redirect("/dashboard/team?error=Akun+aktif+Anda+tidak+dapat+dihapus+sendiri");
    throw error;
  });
  revalidatePath("/dashboard/team");
  redirect("/dashboard/team?success=Anggota+berhasil+dihapus+dari+workspace");
}

export async function revokeWorkspaceInvitationAction(invitationId: string) {
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.members.manage");
  if (!z.string().uuid().safeParse(invitationId).success) redirect("/dashboard/team?error=Undangan+tidak+valid");
  await db.transaction(async (tx) => {
    const [revoked] = await tx.update(workspaceInvitations).set({ status: "REVOKED", updatedAt: new Date() }).where(and(
      eq(workspaceInvitations.id, invitationId), eq(workspaceInvitations.workspaceId, workspace.id), eq(workspaceInvitations.status, "PENDING"),
    )).returning({ id: workspaceInvitations.id });
    if (revoked) await tx.insert(auditLogs).values({ actorId: merchant.actorId, workspaceId: workspace.id, action: "WORKSPACE_INVITATION_REVOKED", entityType: "WORKSPACE_INVITATION", entityId: revoked.id });
  });
  revalidatePath("/dashboard/team");
  redirect("/dashboard/team?success=Undangan+berhasil+dicabut");
}

export async function acceptWorkspaceInvitationAction(token: string, formData: FormData) {
  const tokenHash = invitationTokenHash(token);
  const [invitation] = await db.select({ invitation: workspaceInvitations, workspaceName: workspaces.name }).from(workspaceInvitations)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId)).where(and(
      eq(workspaceInvitations.tokenHash, tokenHash), eq(workspaceInvitations.status, "PENDING"), gt(workspaceInvitations.expiresAt, new Date()),
    )).limit(1);
  if (!invitation) redirect(`/team/invite/${token}?error=Undangan+tidak+valid+atau+sudah+kedaluwarsa`);

  let [target] = await db.select().from(users).where(eq(users.email, invitation.invitation.email)).limit(1);
  const current = await getCurrentUser();
  let newAccount: { name: string; passwordHash: string } | null = null;
  if (target) {
    if (!current) redirect(`/login?next=${encodeURIComponent(`/team/invite/${token}`)}`);
    if (current.id !== target.id || current.email !== invitation.invitation.email) redirect(`/team/invite/${token}?error=Masuklah+dengan+email+yang+menerima+undangan`);
    if (current.role === "ADMIN") redirect(`/team/invite/${token}?error=Admin+platform+tidak+dapat+menjadi+anggota+merchant`);
  } else {
    const parsed = z.object({ name: z.string().trim().min(2).max(80), password: z.string().min(8).max(128), confirmation: z.string().min(8).max(128) }).safeParse({
      name: formData.get("name"), password: formData.get("password"), confirmation: formData.get("confirmation"),
    });
    if (!parsed.success || parsed.data.password !== parsed.data.confirmation) redirect(`/team/invite/${token}?error=Nama+dan+password+minimal+8+karakter+wajib+diisi`);
    newAccount = { name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password) };
  }

  target = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`workspace-invite:${invitation.invitation.id}`}))`);
    let acceptedUser = target;
    if (!acceptedUser && newAccount) {
      [acceptedUser] = await tx.insert(users).values({
        name: newAccount.name,
        email: invitation.invitation.email,
        passwordHash: newAccount.passwordHash,
        role: "MERCHANT",
      }).onConflictDoNothing({ target: users.email }).returning();
      if (!acceptedUser) throw new Error("ACCOUNT_CREATED");
    }
    if (!acceptedUser) throw new Error("ACCOUNT_REQUIRED");
    const [accepted] = await tx.update(workspaceInvitations).set({ status: "ACCEPTED", acceptedBy: acceptedUser.id, acceptedAt: new Date(), updatedAt: new Date() }).where(and(
      eq(workspaceInvitations.id, invitation.invitation.id), eq(workspaceInvitations.status, "PENDING"), gt(workspaceInvitations.expiresAt, new Date()),
    )).returning({ id: workspaceInvitations.id });
    if (!accepted) throw new Error("INVITE_USED");
    await tx.insert(workspaceMemberships).values({ workspaceId: invitation.invitation.workspaceId, userId: acceptedUser.id, role: invitation.invitation.role, status: "ACTIVE" })
      .onConflictDoUpdate({ target: [workspaceMemberships.workspaceId, workspaceMemberships.userId], set: { role: invitation.invitation.role, status: "ACTIVE", updatedAt: new Date() } });
    await tx.insert(auditLogs).values({ actorId: acceptedUser.id, workspaceId: invitation.invitation.workspaceId, action: "WORKSPACE_INVITATION_ACCEPTED", entityType: "WORKSPACE_INVITATION", entityId: invitation.invitation.id, metadata: { role: invitation.invitation.role } });
    return acceptedUser;
  }).catch((error) => {
    if (error instanceof Error && error.message === "INVITE_USED") redirect(`/team/invite/${token}?error=Undangan+sudah+digunakan`);
    if (error instanceof Error && error.message === "ACCOUNT_CREATED") redirect(`/login?next=${encodeURIComponent(`/team/invite/${token}`)}`);
    throw error;
  });
  await createSession(target.id);
  redirect(await userHome(target));
}
