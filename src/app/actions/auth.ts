"use server";

import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import {
  auditLogs,
  legacyMerchantWorkspaceLinks,
  merchantProfiles,
  passwordResetTokens,
  sessions,
  users,
  workspaceBranding,
  workspaceMemberships,
  workspaces,
} from "@/lib/schema";
import { clearRateLimit, currentRequestIdentity, enforceRateLimit } from "@/lib/security";
import {
  createSession,
  deleteSession,
  hashPassword,
  userHome,
  verifyPassword,
} from "@/lib/auth";
import { getNotificationConfig, sendExternalNotification } from "@/lib/notifications";

function accountTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function safeNextPath(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value.trim() : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8).max(128),
});

export async function loginAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=Email+atau+password+tidak+valid");

  const rateLimitKey = await currentRequestIdentity("login", parsed.data.email);
  const rateLimit = await enforceRateLimit(rateLimitKey, { limit: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 });
  if (rateLimit.limited) redirect("/login?error=Terlalu+banyak+percobaan.+Coba+lagi+dalam+15+menit");

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    redirect("/login?error=Email+atau+password+salah");
  }

  await clearRateLimit(rateLimitKey);
  await createSession(user.id);
  redirect(safeNextPath(formData.get("next")) ?? await userHome(user));
}

export async function registerAction(formData: FormData) {
  const rateLimitKey = await currentRequestIdentity("register");
  const rateLimit = await enforceRateLimit(rateLimitKey, { limit: 5, windowMs: 60 * 60_000, blockMs: 60 * 60_000 });
  if (rateLimit.limited) redirect("/register?error=Terlalu+banyak+pendaftaran+dari+perangkat+ini.+Coba+lagi+nanti");
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.string().email().transform((value) => value.toLowerCase().trim()),
      password: z.string().min(8).max(128),
    })
    .safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) redirect("/register?error=Periksa+kembali+data+pendaftaran");
  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "MERCHANT",
      }).onConflictDoNothing({ target: users.email }).returning();
    if (!created) return null;
    const profileSlug = `${slugify(created.name) || "toko"}-${created.id.slice(0, 6)}`;
    const [profile] = await tx.insert(merchantProfiles).values({
      userId: created.id,
      brandName: created.name,
      slug: profileSlug,
      supportEmail: created.email,
    }).returning({ id: merchantProfiles.id });
    const [workspace] = await tx.insert(workspaces).values({
      name: created.name,
      slug: profileSlug,
      kind: "EXTERNAL",
      status: "DRAFT",
      createdBy: created.id,
    }).returning({ id: workspaces.id });
    await tx.insert(workspaceMemberships).values({
      workspaceId: workspace.id,
      userId: created.id,
      role: "OWNER",
      status: "ACTIVE",
    });
    await tx.insert(workspaceBranding).values({
      workspaceId: workspace.id,
      displayName: created.name,
      supportEmail: created.email,
    });
    await tx.insert(legacyMerchantWorkspaceLinks).values({
      merchantProfileId: profile.id,
      legacyMerchantUserId: created.id,
      workspaceId: workspace.id,
    });
    await tx.insert(auditLogs).values({
      actorId: created.id,
      workspaceId: workspace.id,
      action: "WORKSPACE_CREATED",
      entityType: "workspace",
      entityId: workspace.id,
      metadata: { source: "merchant_registration", schemaVersion: 1 },
    });
    return created;
  });

  if (!user) redirect("/login?error=Email+sudah+terdaftar");

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/");
}

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = z.object({ email: z.string().email().transform((value) => value.toLowerCase().trim()) }).safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/forgot-password?error=Masukkan+alamat+email+yang+valid");
  const rateLimitKey = await currentRequestIdentity("password-reset", parsed.data.email);
  const rateLimit = await enforceRateLimit(rateLimitKey, { limit: 3, windowMs: 60 * 60_000, blockMs: 60 * 60_000 });
  if (!rateLimit.limited) {
    const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (user) {
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 60 * 60_000);
      await db.transaction(async (tx) => {
        await tx.delete(passwordResetTokens).where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
        await tx.insert(passwordResetTokens).values({ userId: user.id, tokenHash: accountTokenHash(token), expiresAt });
      });
      const config = getNotificationConfig();
      if (config.mailketingActive) {
        const resetUrl = `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/reset-password/${token}`;
        await sendExternalNotification({
          channel: "EMAIL", recipient: parsed.data.email, subject: "Atur ulang password Lajurin",
          text: `Halo ${user.name}, gunakan tombol berikut untuk membuat password baru. Tautan berlaku selama 60 menit.`,
          actionUrl: resetUrl, actionLabel: "Buat password baru",
        }).catch((error) => console.error("Password reset email failed", error instanceof Error ? error.message : error));
      }
    }
  }
  redirect("/forgot-password?success=Jika+email+terdaftar,+tautan+reset+akan+dikirim");
}

export async function resetPasswordAction(token: string, formData: FormData) {
  const parsed = z.object({ password: z.string().min(8).max(128), confirmation: z.string().min(8).max(128) }).safeParse({
    password: formData.get("password"), confirmation: formData.get("confirmation"),
  });
  if (!parsed.success || parsed.data.password !== parsed.data.confirmation) redirect(`/reset-password/${token}?error=Password+minimal+8+karakter+dan+konfirmasi+harus+sama`);
  const tokenHash = accountTokenHash(token);
  const [record] = await db.select().from(passwordResetTokens).where(and(
    eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()),
  )).limit(1);
  if (!record) redirect("/forgot-password?error=Tautan+reset+tidak+valid+atau+sudah+kedaluwarsa");
  const passwordHash = await hashPassword(parsed.data.password);
  const resetApplied = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`password-reset:${record.id}`}))`);
    const [consumed] = await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(
      eq(passwordResetTokens.id, record.id),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date()),
    )).returning({ userId: passwordResetTokens.userId });
    if (!consumed) return false;
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, consumed.userId));
    await tx.delete(sessions).where(eq(sessions.userId, record.userId));
    await tx.insert(auditLogs).values({ actorId: record.userId, action: "PASSWORD_RESET", entityType: "USER", entityId: record.userId });
    return true;
  });
  if (!resetApplied) redirect("/forgot-password?error=Tautan+reset+tidak+valid+atau+sudah+digunakan");
  await createSession(record.userId);
  const [user] = await db.select().from(users).where(eq(users.id, record.userId)).limit(1);
  redirect(user ? await userHome(user) : "/login");
}
