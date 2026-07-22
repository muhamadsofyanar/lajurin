import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { commissionPayments } from "@/lib/schema";
import { commissionProofPath } from "@/lib/storage";

const contentTypes: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };

export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { paymentId } = await params;
  const [payment] = await db.select().from(commissionPayments).where(eq(commissionPayments.id, paymentId)).limit(1);
  if (!payment) return new Response("Not found", { status: 404 });
  if (user.role !== "ADMIN" && payment.merchantId !== user.id) return new Response("Forbidden", { status: 403 });
  try {
    const data = await readFile(commissionProofPath(payment.proofFileName));
    return new Response(data, { headers: { "Content-Type": contentTypes[path.extname(payment.proofFileName).toLowerCase()] || "application/octet-stream", "Content-Disposition": `inline; filename="${payment.proofFileName}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
