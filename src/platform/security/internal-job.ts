import { timingSafeEqual } from "node:crypto";

export function internalJobTokenMatches(received: string | null) {
  const expected = process.env.INTERNAL_JOB_SECRET;
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function bearerTokenFromRequest(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
}
