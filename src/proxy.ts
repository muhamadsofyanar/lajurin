import { NextResponse, type NextRequest } from "next/server";

const productionPlatformHostnames = ["legaone.id", "www.legaone.id"];

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "").replace(/:\d+$/, "");
}

function configuredPlatformHostnames(request: NextRequest) {
  const hostnames = new Set(["localhost", "127.0.0.1", ...productionPlatformHostnames]);
  try {
    hostnames.add(normalizeHostname(new URL(process.env.APP_URL ?? request.url).hostname));
  } catch {
    hostnames.add(normalizeHostname(request.nextUrl.hostname));
  }
  for (const hostname of (process.env.PLATFORM_HOSTNAMES ?? "").split(",")) {
    const normalized = normalizeHostname(hostname);
    if (normalized) hostnames.add(normalized);
  }
  return hostnames;
}

export function proxy(request: NextRequest) {
  const requestHostname = normalizeHostname(request.nextUrl.hostname);
  if (configuredPlatformHostnames(request).has(requestHostname)) return NextResponse.next();
  const destination = request.nextUrl.clone();
  destination.pathname = `/d/${encodeURIComponent(requestHostname)}`;
  return NextResponse.rewrite(destination);
}

export const config = { matcher: "/" };
