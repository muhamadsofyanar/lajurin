import { z } from "zod";

export const workspaceModuleKeys = ["STOREFRONT", "COURSES", "COMMUNITY", "AUTOMATION", "LANDING_PAGES", "FINANCE"] as const;
export type WorkspaceModuleKey = (typeof workspaceModuleKeys)[number];

const moduleSettingsSchemas: Record<WorkspaceModuleKey, z.ZodType<Record<string, unknown>>> = {
  STOREFRONT: z.object({ showBranding: z.boolean().optional() }).strict(),
  COURSES: z.object({ certificateEnabled: z.boolean().optional() }).strict(),
  COMMUNITY: z.object({ moderationMode: z.enum(["OWNER", "TEAM"]).optional() }).strict(),
  AUTOMATION: z.object({ enabledChannels: z.array(z.enum(["EMAIL", "WHATSAPP"])).optional() }).strict(),
  LANDING_PAGES: z.object({ defaultTemplate: z.enum(["EDITORIAL", "CREATOR", "STUDIO"]).optional() }).strict(),
  FINANCE: z.object({ payoutNotifications: z.boolean().optional() }).strict(),
};

export function normalizeWorkspaceSlug(input: string, fallbackId?: string) {
  const normalized = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72).replace(/-+$/g, "");
  if (normalized.length >= 2) return normalized;
  if (fallbackId) return `workspace-${fallbackId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toLowerCase()}`;
  throw new Error("Slug workspace minimal dua karakter.");
}

export function normalizeHostname(input: string) {
  const value = input.trim().toLowerCase().replace(/\.$/, "");
  if (!value || value.includes("://") || value.includes("/") || value.includes(":")) {
    throw new Error("Hostname harus ditulis tanpa protokol, path, atau port.");
  }
  const parsed = new URL(`https://${value}`);
  const hostname = parsed.hostname.replace(/\.$/, "");
  if (hostname === "localhost" || !hostname.includes(".") || hostname.length > 253) {
    throw new Error("Hostname publik tidak valid.");
  }
  return hostname;
}

export function validateModuleSettings(moduleKey: string, settings: unknown) {
  if (!workspaceModuleKeys.includes(moduleKey as WorkspaceModuleKey)) throw new Error("Module key workspace tidak dikenal.");
  return moduleSettingsSchemas[moduleKey as WorkspaceModuleKey].parse(settings);
}
