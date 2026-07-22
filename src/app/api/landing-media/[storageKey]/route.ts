import { readFile } from "node:fs/promises";
import path from "node:path";
import { landingMediaPath } from "@/lib/storage";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_: Request, { params }: { params: Promise<{ storageKey: string }> }) {
  const { storageKey } = await params;
  const safeKey = path.basename(storageKey);
  const contentType = contentTypes[path.extname(safeKey).toLowerCase()];
  if (!contentType || safeKey !== storageKey) return new Response("Not found", { status: 404 });
  try {
    const file = await readFile(landingMediaPath(safeKey));
    return new Response(file, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
