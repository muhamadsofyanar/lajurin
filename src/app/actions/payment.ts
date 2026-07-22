"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, enrollments, orders, products } from "@/lib/schema";
import { paymentProofDirectory, paymentProofPath } from "@/lib/storage";

const proofTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export async function submitManualPaymentAction(orderId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({
    bankName: z.string().trim().min(2).max(80),
    accountName: z.string().trim().min(2).max(100),
    note: z.string().trim().max(500).optional(),
  }).safeParse({
    bankName: formData.get("bankName"),
    accountName: formData.get("accountName"),
    note: formData.get("note") || undefined,
  });
  const proof = formData.get("proof");
  if (!parsed.success || !(proof instanceof File) || !proofTypes[proof.type] || proof.size < 1 || proof.size > 3 * 1024 * 1024) {
    redirect(`/payment/manual/${orderId}?error=Lengkapi+data+dan+unggah+bukti+JPG,+PNG,+WebP,+atau+PDF+maksimal+3MB`);
  }

  const [order] = await db.select({ id: orders.id }).from(orders).where(and(
    eq(orders.id, orderId), eq(orders.customerId, user.id), eq(orders.paymentMethod, "MANUAL_TRANSFER"), inArray(orders.status, ["PENDING", "REJECTED"]),
  )).limit(1);
  if (!order) redirect("/member/orders?error=Pesanan+tidak+ditemukan");

  const fileName = `${order.id}-${randomUUID()}${proofTypes[proof.type]}`;
  await mkdir(paymentProofDirectory, { recursive: true });
  await writeFile(paymentProofPath(fileName), Buffer.from(await proof.arrayBuffer()), { flag: "wx" });

  await db.update(orders).set({
    status: "AWAITING_CONFIRMATION",
    manualProofUrl: fileName,
    manualBankName: parsed.data.bankName,
    manualAccountName: parsed.data.accountName,
    manualTransferNote: parsed.data.note || null,
    manualSubmittedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    updatedAt: new Date(),
  }).where(eq(orders.id, order.id));
  redirect(`/member/orders?success=Bukti+pembayaran+berhasil+dikirim`);
}

export async function reviewManualPaymentAction(orderId: string, decision: "approve" | "reject") {
  const admin = await requireAdmin();
  const parsedDecision = z.enum(["approve", "reject"]).parse(decision);
  const [row] = await db.select({ order: orders, courseId: courses.id }).from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(courses, eq(courses.productId, products.id))
    .where(and(eq(orders.id, orderId), eq(orders.status, "AWAITING_CONFIRMATION"), eq(orders.paymentMethod, "MANUAL_TRANSFER"))).limit(1);
  if (!row || !row.order.customerId) redirect("/admin/payments?error=Pesanan+tidak+siap+ditinjau");

  await db.transaction(async (tx) => {
    await tx.update(orders).set({
      status: parsedDecision === "approve" ? "PAID" : "REJECTED",
      paidAt: parsedDecision === "approve" ? new Date() : null,
      reviewedAt: new Date(), reviewedBy: admin.id, updatedAt: new Date(),
    }).where(eq(orders.id, row.order.id));
    if (parsedDecision === "approve") {
      await tx.insert(enrollments).values({ userId: row.order.customerId!, courseId: row.courseId, orderId: row.order.id })
        .onConflictDoUpdate({ target: [enrollments.userId, enrollments.courseId], set: { orderId: row.order.id } });
    }
  });
  revalidatePath("/admin");
  revalidatePath("/admin/payments");
  revalidatePath("/member");
}
