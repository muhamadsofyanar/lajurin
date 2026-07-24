import { headers } from "next/headers";
import { correlationContextFromHeaders } from "./context";

export async function currentCorrelationContext() {
  return correlationContextFromHeaders(await headers());
}
