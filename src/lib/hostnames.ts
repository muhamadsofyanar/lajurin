const knownProductionHostnames = ["legaone.id", "www.legaone.id"];

export function normalizeHostname(hostname: string) {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/\.$/, "")
    .replace(/:\d+$/, "");
}

export function platformHostnameSet() {
  const hostnames = new Set(["localhost", "127.0.0.1", ...knownProductionHostnames]);
  if (process.env.APP_URL) {
    try {
      hostnames.add(normalizeHostname(new URL(process.env.APP_URL).hostname));
    } catch {
      // Environment validation reports malformed APP_URL separately.
    }
  }
  for (const hostname of (process.env.PLATFORM_HOSTNAMES ?? "").split(",")) {
    const normalized = normalizeHostname(hostname);
    if (normalized) hostnames.add(normalized);
  }
  return hostnames;
}

export function isPlatformHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  return [...platformHostnameSet()].some((platform) => normalized === platform || normalized.endsWith(`.${platform}`));
}
