export function GET() {
  return Response.json({ status: "ok", service: "rizqhub" }, { headers: { "cache-control": "no-store" } });
}
