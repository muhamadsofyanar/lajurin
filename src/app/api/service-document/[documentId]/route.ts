import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { getCurrentUser, getMerchantAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { serviceCases, serviceDocuments } from "@/lib/schema";
import { serviceDocumentPath } from "@/lib/storage";

function disposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\\r\n]/g, "_") || "dokumen";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { documentId } = await params;
  const [row] = await db.select({ document: serviceDocuments, serviceCase: serviceCases })
    .from(serviceDocuments).innerJoin(serviceCases, eq(serviceDocuments.serviceCaseId, serviceCases.id))
    .where(eq(serviceDocuments.id, documentId)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });
  const merchantAccess = user.role !== "ADMIN" ? await getMerchantAccess(user.id) : null;
  const isMerchant = merchantAccess?.ownerId === row.serviceCase.merchantId;
  const isClient = row.serviceCase.customerId === user.id && (row.document.audience === "CLIENT" || row.document.uploadedBy === user.id);
  if (user.role !== "ADMIN" && !isMerchant && !isClient) return new Response("Forbidden", { status: 403 });
  try {
    const data = await readFile(serviceDocumentPath(row.document.storageKey));
    return new Response(data, { headers: {
      "Content-Type": row.document.mimeType, "Content-Length": String(row.document.size),
      "Content-Disposition": disposition(row.document.fileName), "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
