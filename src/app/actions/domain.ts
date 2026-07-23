"use server";

import { createHash, randomBytes } from "node:crypto";
import { resolveCname, resolveTxt } from "node:dns/promises";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { isPlatformHostname, normalizeHostname, platformHostnameSet } from "@/lib/hostnames";
import { requireMerchantWorkspace } from "@/lib/merchant-workspace";
import { auditLogs, workspaceDomains } from "@/lib/schema";

function normalizedHostname(value: unknown) {
  return normalizeHostname(String(value ?? ""));
}

const hostnameSchema = z.string().min(4).max(253).regex(/^(?=.{4,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/);

export async function addWorkspaceDomainAction(formData: FormData) {
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.manage", "domains");
  await requireFeature("CUSTOM_DOMAINS", merchant.id);
  const parsed = hostnameSchema.safeParse(normalizedHostname(formData.get("hostname")));
  if (!parsed.success) redirect("/dashboard/domains?error=Nama+domain+tidak+valid");
  if (isPlatformHostname(parsed.data)) redirect("/dashboard/domains?error=Gunakan+domain+milik+Anda,+bukan+domain+utama+Lajurin");
  const token = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [existing] = await db.select({ id: workspaceDomains.id, workspaceId: workspaceDomains.workspaceId }).from(workspaceDomains).where(eq(workspaceDomains.hostname, parsed.data)).limit(1);
  if (existing && existing.workspaceId !== workspace.id) redirect("/dashboard/domains?error=Domain+sudah+digunakan+workspace+lain");
  try {
    await db.transaction(async (tx) => {
      const [domain] = existing
        ? await tx.update(workspaceDomains).set({
            status: "PENDING", verificationTokenHash: tokenHash, verificationToken: token, verifiedAt: null,
            dnsStatus: "PENDING", cnameTarget: null, dnsCheckedAt: null, sslStatus: "PENDING", sslCheckedAt: null,
            lastError: null, updatedAt: new Date(),
          }).where(and(eq(workspaceDomains.id, existing.id), eq(workspaceDomains.workspaceId, workspace.id))).returning({ id: workspaceDomains.id })
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
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.manage", "domains");
  await requireFeature("CUSTOM_DOMAINS", merchant.id);
  const [domain] = await db.select().from(workspaceDomains).where(and(eq(workspaceDomains.id, domainId), eq(workspaceDomains.workspaceId, workspace.id))).limit(1);
  if (!domain?.verificationToken) redirect("/dashboard/domains?error=Token+verifikasi+domain+tidak+tersedia");
  const checkedAt = new Date();
  const [txtResult, cnameResult] = await Promise.allSettled([
    resolveTxt(`_lajurin.${domain.hostname}`),
    resolveCname(domain.hostname),
  ]);
  const txtVerified = txtResult.status === "fulfilled"
    && txtResult.value.some((parts) => parts.join("") === `lajurin-verification=${domain.verificationToken}`);
  const cnameTargets = cnameResult.status === "fulfilled" ? cnameResult.value.map(normalizeHostname) : [];
  const platformTargets = platformHostnameSet();
  const cnameVerified = cnameTargets.some((target) => platformTargets.has(target));
  let sslVerified = false;
  if (txtVerified && cnameVerified) {
    try {
      const response = await fetch(`https://${domain.hostname}/api/health`, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(7_000),
      });
      sslVerified = response.status >= 200 && response.status < 500;
    } catch {
      sslVerified = false;
    }
  }
  const verified = txtVerified && cnameVerified && sslVerified;
  const error = !txtVerified
    ? "Record TXT verifikasi belum ditemukan."
    : !cnameVerified
      ? `CNAME belum mengarah ke ${[...platformTargets].filter((item) => !["localhost", "127.0.0.1"].includes(item)).join(" atau ")}.`
      : !sslVerified
        ? "DNS benar, tetapi HTTPS/SSL belum aktif di Coolify."
        : null;
  await db.transaction(async (tx) => {
    await tx.update(workspaceDomains).set({
      status: verified ? "VERIFIED" : txtVerified && cnameVerified ? "PENDING" : "FAILED",
      verifiedAt: verified ? checkedAt : null,
      dnsStatus: txtVerified && cnameVerified ? "VERIFIED" : "FAILED",
      cnameTarget: cnameTargets.join(", ") || null,
      dnsCheckedAt: checkedAt,
      sslStatus: sslVerified ? "ACTIVE" : txtVerified && cnameVerified ? "PENDING" : "NOT_CHECKED",
      sslCheckedAt: txtVerified && cnameVerified ? checkedAt : null,
      lastError: error,
      updatedAt: checkedAt,
    }).where(eq(workspaceDomains.id, domain.id));
    await tx.insert(auditLogs).values({ actorId: merchant.actorId, workspaceId: workspace.id, action: verified ? "WORKSPACE_DOMAIN_VERIFIED" : "WORKSPACE_DOMAIN_VERIFICATION_FAILED", entityType: "WORKSPACE_DOMAIN", entityId: domain.id, metadata: { hostname: domain.hostname } });
  });
  revalidatePath("/dashboard/domains");
  redirect(`/dashboard/domains?${verified ? "success=DNS,+routing,+dan+SSL+domain+berhasil+diverifikasi" : `error=${encodeURIComponent(error ?? "Domain belum siap")}`}`);
}

export async function removeWorkspaceDomainAction(domainId: string) {
  const { merchant, workspace } = await requireMerchantWorkspace("workspace.manage", "domains");
  await requireFeature("CUSTOM_DOMAINS", merchant.id);
  const [removed] = await db.delete(workspaceDomains).where(and(eq(workspaceDomains.id, domainId), eq(workspaceDomains.workspaceId, workspace.id))).returning({ id: workspaceDomains.id, hostname: workspaceDomains.hostname });
  if (removed) await db.insert(auditLogs).values({ actorId: merchant.actorId, workspaceId: workspace.id, action: "WORKSPACE_DOMAIN_REMOVED", entityType: "WORKSPACE_DOMAIN", entityId: removed.id, metadata: { hostname: removed.hostname } });
  revalidatePath("/dashboard/domains");
  redirect("/dashboard/domains?success=Domain+berhasil+dihapus");
}
