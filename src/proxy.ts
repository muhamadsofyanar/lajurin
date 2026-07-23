import { NextResponse, type NextRequest } from "next/server";

const productionPlatformHostnames = ["legaone.id", "www.legaone.id"];

function normalizeHostname(hostname: string) {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/\.$/, "")
    .replace(/:\d+$/, "");
}

function configuredPlatformHostnames() {
  const hostnames = new Set(["localhost", "127.0.0.1", ...productionPlatformHostnames]);
  if (process.env.APP_URL) {
    try {
      hostnames.add(normalizeHostname(new URL(process.env.APP_URL).hostname));
    } catch {
      // Startup validation reports an invalid APP_URL. Routing remains on known platform hosts.
    }
  }
  for (const hostname of (process.env.PLATFORM_HOSTNAMES ?? "").split(",")) {
    const normalized = normalizeHostname(hostname);
    if (normalized) hostnames.add(normalized);
  }
  return hostnames;
}

function requestHostnameCandidates(request: NextRequest) {
  const candidates = [
    request.headers.get("host"),
    ...(request.headers.get("x-forwarded-host") ?? "").split(","),
    request.nextUrl.hostname,
  ];
  return [...new Set(candidates.map((hostname) => normalizeHostname(hostname ?? "")).filter(Boolean))];
}

export function proxy(request: NextRequest) {
  const requestHostnames = requestHostnameCandidates(request);
  const platformHostnames = configuredPlatformHostnames();
  if (requestHostnames.some((hostname) => platformHostnames.has(hostname))) return NextResponse.next();

  const requestHostname = requestHostnames[0];
  if (!requestHostname) return NextResponse.next();

  const destination = request.nextUrl.clone();
  destination.pathname = `/d/${encodeURIComponent(requestHostname)}`;
  return NextResponse.rewrite(destination);
}

export const config = { matcher: "/" };
