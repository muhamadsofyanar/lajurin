"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createInAppNotification } from "@/lib/in-app-notifications";
import { conversationMessages, conversations, courses, enrollments, products } from "@/lib/schema";

async function authorizedConversation(user: Awaited<ReturnType<typeof requireUser>>, conversationId: string) {
  const [row] = await db.select({ conversation: conversations, productName: products.name }).from(conversations)
    .innerJoin(products, eq(conversations.productId, products.id)).where(eq(conversations.id, conversationId)).limit(1);
  if (!row || (user.role !== "ADMIN" && row.conversation.merchantId !== user.id && row.conversation.memberId !== user.id)) return null;
  return row;
}

export async function startMemberConversationAction(productId: string) {
  const user = await requireUser();
  if (user.role !== "MEMBER") redirect("/inbox");
  const [access] = await db.select({ merchantId: products.merchantId }).from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id)).innerJoin(products, eq(courses.productId, products.id))
    .where(and(eq(enrollments.userId, user.id), eq(products.id, productId))).limit(1);
  if (!access) redirect("/member?error=Kelas+tidak+ditemukan");
  const [conversation] = await db.insert(conversations).values({ merchantId: access.merchantId, memberId: user.id, productId })
    .onConflictDoUpdate({ target: [conversations.merchantId, conversations.memberId, conversations.productId], set: { updatedAt: new Date() } }).returning();
  redirect(`/inbox/${conversation.id}`);
}

export async function startMerchantConversationAction(memberId: string, productId: string) {
  const user = await requireUser();
  if (user.role !== "MERCHANT") redirect("/inbox");
  const [access] = await db.select({ id: enrollments.id }).from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id)).innerJoin(products, eq(courses.productId, products.id))
    .where(and(eq(enrollments.userId, memberId), eq(products.id, productId), eq(products.merchantId, user.id))).limit(1);
  if (!access) redirect("/dashboard/customers?error=Member+tidak+ditemukan");
  const [conversation] = await db.insert(conversations).values({ merchantId: user.id, memberId, productId })
    .onConflictDoUpdate({ target: [conversations.merchantId, conversations.memberId, conversations.productId], set: { updatedAt: new Date() } }).returning();
  redirect(`/inbox/${conversation.id}`);
}

export async function sendConversationMessageAction(conversationId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({ body: z.string().trim().min(1).max(3000) }).safeParse({ body: formData.get("body") });
  if (!parsed.success) redirect(`/inbox/${conversationId}?error=Pesan+belum+valid`);
  const row = await authorizedConversation(user, conversationId);
  if (!row || user.role === "ADMIN") redirect("/inbox");
  const [message] = await db.insert(conversationMessages).values({ conversationId, senderId: user.id, body: parsed.data.body }).returning({ id: conversationMessages.id });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));
  const recipientId = user.id === row.conversation.merchantId ? row.conversation.memberId : row.conversation.merchantId;
  await createInAppNotification({
    userId: recipientId, actorId: user.id, type: "INBOX_MESSAGE", title: `Pesan baru · ${row.productName}`,
    body: `${user.name}: ${parsed.data.body.slice(0, 140)}`, href: `/inbox/${conversationId}`,
    dedupeKey: `conversation-message:${message.id}`,
  });
  revalidatePath("/inbox");
  revalidatePath(`/inbox/${conversationId}`);
}

export async function markConversationReadAction(conversationId: string) {
  const user = await requireUser();
  const row = await authorizedConversation(user, conversationId);
  if (!row || user.role === "ADMIN") return;
  await db.update(conversationMessages).set({ readAt: new Date() }).where(and(
    eq(conversationMessages.conversationId, conversationId),
    user.id === row.conversation.merchantId ? eq(conversationMessages.senderId, row.conversation.memberId) : eq(conversationMessages.senderId, row.conversation.merchantId),
  ));
  revalidatePath("/inbox");
}
