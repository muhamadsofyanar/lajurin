"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyUploadSignature } from "@/lib/security";
import { auditLogs, orders, products, serviceCaseNotes, serviceCases, serviceDocuments, serviceProductFields, workspaceMemberships } from "@/lib/schema";
import { serviceDocumentDirectory, serviceDocumentPath } from "@/lib/storage";

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const documentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

async function merchantCase(caseId: string, merchantId: string) {
  const [row] = await db.select({ serviceCase: serviceCases, order: orders })
    .from(serviceCases).innerJoin(orders, eq(serviceCases.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .where(and(eq(serviceCases.id, caseId), eq(serviceCases.merchantId, merchantId), eq(products.type, "SERVICE"))).limit(1);
  return row;
}

async function clientCase(caseId: string, userId: string) {
  const [row] = await db.select({ serviceCase: serviceCases, order: orders })
    .from(serviceCases).innerJoin(orders, eq(serviceCases.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .where(and(eq(serviceCases.id, caseId), eq(serviceCases.customerId, userId), eq(orders.customerId, userId), eq(products.type, "SERVICE"))).limit(1);
  return row;
}

export async function updateServiceCaseAction(caseId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({
    status: z.enum(["WAITING_PAYMENT", "WAITING_DOCUMENTS", "DOCUMENT_REVIEW", "REVISION_REQUIRED", "IN_PROGRESS", "WAITING_AGENCY", "COMPLETED", "CANCELLED"]),
    assignedTo: z.union([z.literal(""), z.string().uuid()]).optional(),
    targetDate: z.string().optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || !(await merchantCase(caseId, merchant.id))) redirect(`/dashboard/services/${caseId}?error=Perubahan+tidak+valid`);
  const targetDate = parsed.data.targetDate ? new Date(`${parsed.data.targetDate}T17:00:00+07:00`) : null;
  if (targetDate && Number.isNaN(targetDate.getTime())) redirect(`/dashboard/services/${caseId}?error=Tanggal+tidak+valid`);
  if (parsed.data.assignedTo && parsed.data.assignedTo !== merchant.id) {
    if (!merchant.workspaceId) redirect(`/dashboard/services/${caseId}?error=Anggota+tim+tidak+valid`);
    const [membership] = await db.select({ id: workspaceMemberships.id }).from(workspaceMemberships)
      .where(and(eq(workspaceMemberships.workspaceId, merchant.workspaceId), eq(workspaceMemberships.userId, parsed.data.assignedTo), eq(workspaceMemberships.status, "ACTIVE"))).limit(1);
    if (!membership) redirect(`/dashboard/services/${caseId}?error=Anggota+tim+tidak+valid`);
  }

  await db.transaction(async (tx) => {
    await tx.update(serviceCases).set({
      status: parsed.data.status,
      assignedTo: parsed.data.assignedTo || null,
      targetDate,
      completedAt: parsed.data.status === "COMPLETED" ? new Date() : null,
      updatedAt: new Date(),
    }).where(and(eq(serviceCases.id, caseId), eq(serviceCases.merchantId, merchant.id)));
    await tx.insert(auditLogs).values({
      actorId: merchant.actorId, workspaceId: merchant.workspaceId,
      action: "SERVICE_CASE_UPDATED", entityType: "SERVICE_CASE", entityId: caseId,
      metadata: { status: parsed.data.status, assignedTo: parsed.data.assignedTo || null },
    });
  });
  revalidatePath(`/dashboard/services/${caseId}`);
  revalidatePath(`/member/services/${caseId}`);
}

export async function addServiceNoteAction(caseId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({
    visibility: z.enum(["INTERNAL", "CLIENT"]),
    body: z.string().trim().min(2).max(5000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || !(await merchantCase(caseId, merchant.id))) redirect(`/dashboard/services/${caseId}?error=Catatan+tidak+valid`);
  await db.insert(serviceCaseNotes).values({ serviceCaseId: caseId, authorId: merchant.actorId, ...parsed.data });
  await db.update(serviceCases).set({ updatedAt: new Date() }).where(eq(serviceCases.id, caseId));
  revalidatePath(`/dashboard/services/${caseId}`);
  revalidatePath(`/member/services/${caseId}`);
}

export async function saveServiceIntakeAction(caseId: string, formData: FormData) {
  const user = await requireUser();
  const row = await clientCase(caseId, user.id);
  if (!row) redirect(`/member/services/${caseId}?error=Data+belum+valid`);
  if (row.order.status !== "PAID") redirect(`/member/services/${caseId}?error=Lengkapi+setelah+pembayaran+dikonfirmasi`);
  const fields = await db.select().from(serviceProductFields)
    .where(eq(serviceProductFields.productId, row.order.productId)).orderBy(asc(serviceProductFields.position));
  const intakeData: Record<string, string> = {};
  for (const field of fields) {
    const value = String(formData.get(field.fieldKey) ?? "").trim();
    const max = field.type === "TEXTAREA" ? 3000 : 200;
    if ((field.required && !value) || value.length > max) redirect(`/member/services/${caseId}?error=Data+belum+valid`);
    if (value) intakeData[field.fieldKey] = value;
  }
  await db.update(serviceCases).set({
    intakeData,
    status: row.serviceCase.status === "WAITING_DOCUMENTS" ? "DOCUMENT_REVIEW" : row.serviceCase.status,
    updatedAt: new Date(),
  }).where(eq(serviceCases.id, caseId));
  revalidatePath(`/member/services/${caseId}`);
  revalidatePath(`/dashboard/services/${caseId}`);
}

function fieldKey(label: string) {
  const base = label.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "_").slice(0, 40) || "field";
  return `${base}_${randomUUID().slice(0, 6)}`;
}

export async function addServiceFieldAction(productId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({
    label: z.string().trim().min(2).max(100),
    type: z.enum(["TEXT", "TEXTAREA"]),
  }).safeParse(Object.fromEntries(formData));
  const [product] = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.id, productId), eq(products.merchantId, merchant.id), eq(products.type, "SERVICE"))).limit(1);
  if (!product || !parsed.success) redirect(`/dashboard/services/products/${productId}?error=Kolom+tidak+valid`);
  const existing = await db.select({ position: serviceProductFields.position }).from(serviceProductFields)
    .where(eq(serviceProductFields.productId, productId)).orderBy(asc(serviceProductFields.position));
  await db.insert(serviceProductFields).values({
    productId, fieldKey: fieldKey(parsed.data.label), label: parsed.data.label, type: parsed.data.type,
    required: formData.get("required") === "on", position: (existing.at(-1)?.position ?? 0) + 1,
  });
  revalidatePath(`/dashboard/services/products/${productId}`);
}

export async function deleteServiceFieldAction(fieldId: string) {
  const merchant = await requireMerchant("manage");
  const [row] = await db.select({ field: serviceProductFields, product: products }).from(serviceProductFields)
    .innerJoin(products, eq(serviceProductFields.productId, products.id))
    .where(and(eq(serviceProductFields.id, fieldId), eq(products.merchantId, merchant.id), eq(products.type, "SERVICE"))).limit(1);
  if (!row) redirect("/dashboard/services?error=Kolom+tidak+ditemukan");
  await db.delete(serviceProductFields).where(eq(serviceProductFields.id, fieldId));
  revalidatePath(`/dashboard/services/products/${row.product.id}`);
}

async function storeDocument(input: { caseId: string; uploadedBy: string; audience: "MERCHANT" | "CLIENT"; label: string; file: File }) {
  if (!documentTypes.has(input.file.type) || input.file.size < 1 || input.file.size > MAX_DOCUMENT_SIZE) throw new Error("INVALID_FILE");
  const buffer = Buffer.from(await input.file.arrayBuffer());
  if (!verifyUploadSignature(buffer, input.file.type)) throw new Error("INVALID_FILE");
  const extension = input.file.type === "application/pdf" ? ".pdf" : input.file.type === "image/png" ? ".png" : ".jpg";
  const storageKey = `${randomUUID()}${extension}`;
  await mkdir(serviceDocumentDirectory, { recursive: true });
  await writeFile(serviceDocumentPath(storageKey), buffer, { flag: "wx" });
  await db.insert(serviceDocuments).values({
    serviceCaseId: input.caseId, uploadedBy: input.uploadedBy, audience: input.audience, label: input.label,
    fileName: path.basename(input.file.name).slice(0, 180) || `dokumen${extension}`,
    storageKey, mimeType: input.file.type, size: input.file.size,
  });
}

export async function uploadClientServiceDocumentAction(caseId: string, formData: FormData) {
  const user = await requireUser();
  const row = await clientCase(caseId, user.id);
  const file = formData.get("file");
  const label = z.string().trim().min(2).max(100).safeParse(formData.get("label"));
  if (!row || row.order.status !== "PAID" || !(file instanceof File) || !label.success) redirect(`/member/services/${caseId}?error=Dokumen+tidak+valid`);
  try {
    await storeDocument({ caseId, uploadedBy: user.id, audience: "MERCHANT", label: label.data, file });
  } catch {
    redirect(`/member/services/${caseId}?error=Gunakan+PDF,+JPG,+atau+PNG+maksimal+10+MB`);
  }
  await db.update(serviceCases).set({ status: "DOCUMENT_REVIEW", updatedAt: new Date() }).where(eq(serviceCases.id, caseId));
  revalidatePath(`/member/services/${caseId}`);
  revalidatePath(`/dashboard/services/${caseId}`);
}

export async function uploadMerchantServiceDocumentAction(caseId: string, formData: FormData) {
  const merchant = await requireMerchant("manage");
  const file = formData.get("file");
  const label = z.string().trim().min(2).max(100).safeParse(formData.get("label"));
  if (!(await merchantCase(caseId, merchant.id)) || !(file instanceof File) || !label.success) redirect(`/dashboard/services/${caseId}?error=Dokumen+tidak+valid`);
  try {
    await storeDocument({ caseId, uploadedBy: merchant.actorId, audience: "CLIENT", label: label.data, file });
  } catch {
    redirect(`/dashboard/services/${caseId}?error=Gunakan+PDF,+JPG,+atau+PNG+maksimal+10+MB`);
  }
  revalidatePath(`/dashboard/services/${caseId}`);
  revalidatePath(`/member/services/${caseId}`);
}
