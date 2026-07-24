import { NextResponse, type NextRequest } from "next/server";
import { normalizeHostname, platformHostnameSet } from "@/lib/hostnames";
import { correlationContextFromHeaders, correlationHeaders } from "@/platform/observability/context";

function requestHostnameCandidates(request: NextRequest) {
  const candidates = [
    request.headers.get("host"),
    ...(request.headers.get("x-forwarded-host") ?? "").split(","),
    request.nextUrl.hostname,
  ];
  return [...new Set(candidates.map((hostname) => normalizeHostname(hostname ?? "")).filter(Boolean))];
}

export function proxy(request: NextRequest) {
  const context = correlationContextFromHeaders(request.headers);
  const propagatedHeaders = new Headers(request.headers);
  for (const [key, value] of Object.entries(correlationHeaders(context))) propagatedHeaders.set(key, value);

  const requestHostnames = requestHostnameCandidates(request);
  const platformHostnames = platformHostnameSet();
  const requestHostname = requestHostnames[0];
  const shouldRewriteCustomDomainRoot = Boolean(
    requestHostname
    && request.nextUrl.pathname === "/"
    && !requestHostnames.some((hostname) => platformHostnames.has(hostname)),
  );

  let response: NextResponse;
  if (shouldRewriteCustomDomainRoot) {
    const destination = request.nextUrl.clone();
    destination.pathname = `/d/${encodeURIComponent(requestHostname!)}`;
    response = NextResponse.rewrite(destination, { request: { headers: propagatedHeaders } });
  } else {
    response = NextResponse.next({ request: { headers: propagatedHeaders } });
  }

  for (const [key, value] of Object.entries(correlationHeaders(context))) response.headers.set(key, value);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
