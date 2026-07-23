import { NextResponse, type NextRequest } from "next/server";
import { normalizeHostname, platformHostnameSet } from "@/lib/hostnames";

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
  const platformHostnames = platformHostnameSet();
  if (requestHostnames.some((hostname) => platformHostnames.has(hostname))) return NextResponse.next();

  const requestHostname = requestHostnames[0];
  if (!requestHostname) return NextResponse.next();

  const destination = request.nextUrl.clone();
  destination.pathname = `/d/${encodeURIComponent(requestHostname)}`;
  return NextResponse.rewrite(destination);
}

export const config = { matcher: "/" };
