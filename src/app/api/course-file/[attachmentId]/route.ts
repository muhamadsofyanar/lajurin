import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, enrollments, lessonAttachments, lessons, products } from "@/lib/schema";
import { courseFilePath } from "@/lib/storage";

function safeContentDisposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\\r\n]/g, "_") || "materi";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ attachmentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { attachmentId } = await params;
  const [row] = await db.select({
    attachment: lessonAttachments,
    courseId: courses.id,
    merchantId: products.merchantId,
  }).from(lessonAttachments)
    .innerJoin(lessons, eq(lessonAttachments.lessonId, lessons.id))
    .innerJoin(courses, eq(lessons.courseId, courses.id))
    .innerJoin(products, eq(courses.productId, products.id))
    .where(eq(lessonAttachments.id, attachmentId)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });

  let authorized = user.role === "ADMIN" || row.merchantId === user.id;
  if (!authorized) {
    const [enrollment] = await db.select({ id: enrollments.id }).from(enrollments)
      .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, row.courseId))).limit(1);
    authorized = Boolean(enrollment);
  }
  if (!authorized) return new Response("Forbidden", { status: 403 });

  const storageKey = path.basename(row.attachment.storageKey);
  if (storageKey !== row.attachment.storageKey) return new Response("Invalid file", { status: 400 });
  try {
    const data = await readFile(courseFilePath(storageKey));
    return new Response(data, {
      headers: {
        "Content-Type": row.attachment.mimeType || "application/octet-stream",
        "Content-Length": String(row.attachment.size),
        "Content-Disposition": safeContentDisposition(row.attachment.fileName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("File not found", { status: 404 });
  }
}
