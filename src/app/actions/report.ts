"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, productReports, products } from "@/lib/schema";

export async function reportProductAction(productId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({
    reason: z.enum(["MISLEADING", "ILLEGAL", "COPYRIGHT", "PRIVACY", "FRAUD", "OTHER"]),
    details: z.string().trim().min(20).max(2000),
  }).safeParse(Object.fromEntries(formData));
  const [product] = await db.select({ id: products.id, slug: products.slug }).from(products).where(eq(products.id, productId)).limit(1);
  if (!parsed.success || !product) redirect("/marketplace?error=Laporan+tidak+valid");
  const [existing] = await db.select({ id: productReports.id }).from(productReports).where(and(
    eq(productReports.productId, productId), eq(productReports.reporterId, user.id), eq(productReports.status, "OPEN"),
  )).limit(1);
  if (existing) redirect(`/p/${product.slug}/report?error=Laporan+Anda+sedang+ditinjau`);
  await db.insert(productReports).values({ productId, reporterId: user.id, ...parsed.data });
  redirect(`/p/${product.slug}/report?success=Laporan+berhasil+dikirim+untuk+ditinjau`);
}

export async function reviewProductReportAction(reportId: string, decision: "RESOLVED" | "DISMISSED", formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({ note: z.string().trim().min(5).max(1000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/reports?error=Catatan+peninjauan+wajib+diisi");
  const [report] = await db.update(productReports).set({
    status: decision, adminNote: parsed.data.note, reviewedBy: admin.id, reviewedAt: new Date(), updatedAt: new Date(),
  }).where(and(eq(productReports.id, reportId), eq(productReports.status, "OPEN"))).returning({ id: productReports.id });
  if (!report) redirect("/admin/reports?error=Laporan+sudah+ditinjau");
  await db.insert(auditLogs).values({ actorId: admin.id, action: `PRODUCT_REPORT_${decision}`, entityType: "PRODUCT_REPORT", entityId: reportId, metadata: { note: parsed.data.note } });
  revalidatePath("/admin/reports");
}
