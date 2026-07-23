import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const appHostname = new URL(process.env.APP_URL ?? request.url).hostname.toLowerCase();
  const requestHostname = request.nextUrl.hostname.toLowerCase();
  if (requestHostname === appHostname || requestHostname === "localhost" || requestHostname === "127.0.0.1") return NextResponse.next();
  const destination = request.nextUrl.clone();
  destination.pathname = `/d/${encodeURIComponent(requestHostname)}`;
  return NextResponse.rewrite(destination);
}

export const config = { matcher: "/" };
