export type MerchantCapability = "read" | "manage" | "members" | "finance" | "broadcast" | "domains";
export type MerchantTeamRole = "OWNER" | "ADMIN" | "FINANCE" | "STAFF" | "MEMBER";

const merchantCapabilities: Record<MerchantTeamRole, readonly MerchantCapability[]> = {
  OWNER: ["read", "manage", "members", "finance", "broadcast", "domains"],
  ADMIN: ["read", "manage", "members", "broadcast", "domains"],
  FINANCE: ["read", "finance"],
  STAFF: ["read", "manage"],
  MEMBER: [],
};

export function merchantCan(role: MerchantTeamRole, capability: MerchantCapability) {
  return merchantCapabilities[role].includes(capability);
}

export function visibleMerchantCapabilities(role: MerchantTeamRole) {
  return [...merchantCapabilities[role]];
}
