"use server";

import { createHash, randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { requireMerchantWorkspace } from "@/lib/merchant-workspace";
import { auditLogs, workspaceDomains } from "@/lib/schema";

function normalizedHostname(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
}

const hostnameSchema = z.string().min(4).max(253).regex(/^(?=.{4,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);

export async function addWorkspaceDomainAction(formData: FormData) {
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.manage");
  await requireFeature("CUSTOM_DOMAINS", merchant.id);
  const parsed = hostnameSchema.safeParse(normalizedHostname(formData.get("hostname")));
  if (!parsed.success) redirect("/dashboard/domains?error=Nama+domain+tidak+valid");
  const appHostname = new URL(process.env.APP_URL ?? "http://localhost:3000").hostname.toLowerCase();
  if (parsed.data === appHostname || parsed.data.endsWith(`.${appHostname}`)) redirect("/dashboard/domains?error=Gunakan+domain+milik+Anda,+bukan+domain+utama+Lajurin");
  const token = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [existing] = await db.select({ id: workspaceDomains.id, workspaceId: workspaceDomains.workspaceId }).from(workspaceDomains).where(eq(workspaceDomains.hostname, parsed.data)).limit(1);
  if (existing && existing.workspaceId !== workspace.id) redirect("/dashboard/domains?error=Domain+sudah+digunakan+workspace+lain");
  try {
    await db.transaction(async (tx) => {
      const [domain] = existing
        ? await tx.update(workspaceDomains).set({ status: "PENDING", verificationTokenHash: tokenHash, verificationToken: token, verifiedAt: null, updatedAt: new Date() }).where(and(eq(workspaceDomains.id, existing.id), eq(workspaceDomains.workspaceId, workspace.id))).returning({ id: workspaceDomains.id })
        : await tx.insert(workspaceDomains).values({ workspaceId: workspace.id, hostname: parsed.data, verificationTokenHash: tokenHash, verificationToken: token }).returning({ id: workspaceDomains.id });
      await tx.insert(auditLogs).values({ actorId: merchant.actorId, workspaceId: workspace.id, action: "WORKSPACE_DOMAIN_ADDED", entityType: "WORKSPACE_DOMAIN", entityId: domain.id, metadata: { hostname: parsed.data } });
    });
  } catch {
    redirect("/dashboard/domains?error=Domain+sudah+digunakan+workspace+lain");
  }
  revalidatePath("/dashboard/domains");
  redirect("/dashboard/domains?success=Domain+ditambahkan.+Buat+record+TXT+lalu+verifikasi");
}

export async function verifyWorkspaceDomainAction(domainId: string) {
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.manage");
  await requireFeature("CUSTOM_DOMAINS", merchant.id);
  const [domain] = await db.select().from(workspaceDomains).where(and(eq(workspaceDomains.id, domainId), eq(workspaceDomains.workspaceId, workspace.id))).limit(1);
  if (!domain?.verificationToken) redirect("/dashboard/domains?error=Token+verifikasi+domain+tidak+tersedia");
  let verified = false;
  try {
    const records = await resolveTxt(`_lajurin.${domain.hostname}`);
    verified = records.some((parts) => parts.join("") === `lajurin-verification=${domain.verificationToken}`);
  } catch { verified = false; }
  await db.transaction(async (tx) => {
    await tx.update(workspaceDomains).set({ status: verified ? "VERIFIED" : "FAILED", verifiedAt: verified ? new Date() : null, updatedAt: new Date() }).where(eq(workspaceDomains.id, domain.id));
    await tx.insert(auditLogs).values({ actorId: merchant.actorId, workspaceId: workspace.id, action: verified ? "WORKSPACE_DOMAIN_VERIFIED" : "WORKSPACE_DOMAIN_VERIFICATION_FAILED", entityType: "WORKSPACE_DOMAIN", entityId: domain.id, metadata: { hostname: domain.hostname } });
  });
  revalidatePath("/dashboard/domains");
  redirect(`/dashboard/domains?${verified ? "success=Domain+berhasil+diverifikasi" : "error=Record+TXT+belum+ditemukan.+Tunggu+propagasi+DNS+dan+coba+lagi"}`);
}

export async function removeWorkspaceDomainAction(domainId: string) {
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.manage");
  await requireFeature("CUSTOM_DOMAINS", merchant.id);
  const [removed] = await db.delete(workspaceDomains).where(and(eq(workspaceDomains.id, domainId), eq(workspaceDomains.workspaceId, workspace.id))).returning({ id: workspaceDomains.id, hostname: workspaceDomains.hostname });
  if (removed) await db.insert(auditLogs).values({ actorId: merchant.actorId, workspaceId: workspace.id, action: "WORKSPACE_DOMAIN_REMOVED", entityType: "WORKSPACE_DOMAIN", entityId: removed.id, metadata: { hostname: removed.hostname } });
  revalidatePath("/dashboard/domains");
  redirect("/dashboard/domains?success=Domain+berhasil+dihapus");
}
