export function GET() {
  return Response.json({ status: "ok", service: "lajurin" }, { headers: { "cache-control": "no-store" } });
}
