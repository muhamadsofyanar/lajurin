import { createHash, randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { legacyMerchantWorkspaceLinks, merchantProfiles, sessions, users, workspaceMemberships, workspaces } from "@/lib/schema";

const SESSION_COOKIE = "lajurin_session";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_AGE_SECONDS * 1000);

  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(lt(sessions.expiresAt, new Date()));
    await tx.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
    const activeSessions = await tx.select({ id: sessions.id }).from(sessions)
      .where(eq(sessions.userId, userId)).orderBy(desc(sessions.createdAt));
    if (activeSessions.length > 5) await tx.delete(sessions).where(inArray(sessions.id, activeSessions.slice(5).map((session) => session.id)));
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_AGE_SECONDS,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [result] = await db.select({ user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  return result?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type MerchantCapability = "read" | "manage" | "members" | "finance";

const merchantCapabilities: Record<"OWNER" | "ADMIN" | "FINANCE" | "STAFF" | "MEMBER", readonly MerchantCapability[]> = {
  OWNER: ["read", "manage", "members", "finance"],
  ADMIN: ["read", "manage", "members"],
  FINANCE: ["read", "finance"],
  STAFF: ["read", "manage"],
  MEMBER: [],
};

export async function getMerchantAccess(userId: string) {
  const [ownedProfile] = await db.select({ id: merchantProfiles.id }).from(merchantProfiles)
    .where(eq(merchantProfiles.userId, userId)).limit(1);
  if (ownedProfile) return { ownerId: userId, membershipRole: "OWNER" as const, workspaceId: null as string | null };
  const [access] = await db.select({
    ownerId: legacyMerchantWorkspaceLinks.legacyMerchantUserId,
    workspaceId: workspaceMemberships.workspaceId,
    membershipRole: workspaceMemberships.role,
  }).from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
    .innerJoin(legacyMerchantWorkspaceLinks, eq(legacyMerchantWorkspaceLinks.workspaceId, workspaceMemberships.workspaceId))
    .where(and(
      eq(workspaceMemberships.userId, userId),
      eq(workspaceMemberships.status, "ACTIVE"),
      eq(workspaces.status, "ACTIVE"),
    )).limit(1);
  return access ?? null;
}

export async function userHome(user: typeof users.$inferSelect) {
  if (user.role === "ADMIN") return "/admin";
  if (await getMerchantAccess(user.id)) return "/dashboard";
  return "/member";
}

export async function requireMerchant(capability: MerchantCapability = "read") {
  const actor = await requireUser();
  if (actor.role === "ADMIN") redirect("/admin");

  const access = await getMerchantAccess(actor.id);
  if (!access || !merchantCapabilities[access.membershipRole].includes(capability)) redirect(actor.role === "MEMBER" ? "/member" : "/dashboard?error=Akses+tim+tidak+mencukupi");

  if (access.ownerId === actor.id) return Object.assign(actor, {
    actorId: actor.id,
    actorName: actor.name,
    membershipRole: access.membershipRole,
    workspaceId: access.workspaceId,
  });

  const [owner] = await db.select().from(users).where(eq(users.id, access.ownerId)).limit(1);
  if (!owner) redirect("/member");
  return Object.assign(owner, {
    actorId: actor.id,
    actorName: actor.name,
    membershipRole: access.membershipRole,
    workspaceId: access.workspaceId,
  });
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect(user.role === "MEMBER" ? "/member" : "/dashboard");
  return user;
}
