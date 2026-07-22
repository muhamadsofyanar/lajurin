import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { platformFeatureFlags } from "@/lib/schema";

export const featureFlagDefinitions = [
  { key: "WORKSPACE_TEAMS", name: "Workspace & tim", description: "Pengelolaan anggota dan peran workspace." },
  { key: "DIRECT_MANUAL_PAYMENTS", name: "Transfer langsung merchant", description: "Transfer manual langsung ke rekening merchant dan konfirmasi merchant." },
  { key: "COMMISSION_BILLING", name: "Tagihan komisi", description: "Pengajuan dan verifikasi pelunasan komisi merchant." },
  { key: "LANDING_PAGE_BUILDER", name: "Landing Page Builder", description: "Editor halaman penjualan dan pratinjau publik." },
  { key: "SALES_REPORTS", name: "Laporan penjualan", description: "Ringkasan berperiode dan ekspor CSV penjualan." },
  { key: "BASIC_NOTIFICATIONS", name: "Notifikasi dasar", description: "Notifikasi in-app untuk kejadian operasional penting." },
] as const;

export type FeatureFlagKey = typeof featureFlagDefinitions[number]["key"];
export type FeatureFlagRollout = "OFF" | "ALL" | "USERS";

export function evaluateFeatureFlag(input: { rollout: FeatureFlagRollout; audienceUserIds: readonly string[] }, userId?: string) {
  if (input.rollout === "ALL") return true;
  return input.rollout === "USERS" && Boolean(userId) && input.audienceUserIds.includes(userId!);
}

export async function featureEnabled(key: FeatureFlagKey, userId?: string) {
  const [flag] = await db.select({ rollout: platformFeatureFlags.rollout, audienceUserIds: platformFeatureFlags.audienceUserIds })
    .from(platformFeatureFlags).where(eq(platformFeatureFlags.key, key)).limit(1);
  return flag ? evaluateFeatureFlag(flag, userId) : false;
}

export async function enabledFeatureMap(userId?: string) {
  const keys = featureFlagDefinitions.map((flag) => flag.key);
  const rows = await db.select({ key: platformFeatureFlags.key, rollout: platformFeatureFlags.rollout, audienceUserIds: platformFeatureFlags.audienceUserIds })
    .from(platformFeatureFlags).where(inArray(platformFeatureFlags.key, keys));
  const result = Object.fromEntries(keys.map((key) => [key, false])) as Record<FeatureFlagKey, boolean>;
  for (const row of rows) {
    if (row.key in result) result[row.key as FeatureFlagKey] = evaluateFeatureFlag(row, userId);
  }
  return result;
}

export async function requireFeature(key: FeatureFlagKey, userId: string, fallback = "/dashboard") {
  if (!(await featureEnabled(key, userId))) redirect(`${fallback}?error=Fitur+belum+diaktifkan+admin`);
}
