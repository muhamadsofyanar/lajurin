"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { canModerateSpace, getAccessibleCommunitySpace } from "@/lib/community";
import { db } from "@/lib/db";
import { createInAppNotification } from "@/lib/in-app-notifications";
import {
  communityComments,
  communityPosts,
  communityReactions,
  communityReports,
  communitySpaces,
  products,
} from "@/lib/schema";
import { communityMediaDirectory, communityMediaPath } from "@/lib/storage";
import { verifyUploadSignature } from "@/lib/security";

const imageTypes: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const reactionSchema = z.enum(["LIKE", "INSIGHTFUL", "CELEBRATE"]);
const communityPath = (spaceId: string) => `/community?space=${spaceId}`;

export async function createCommunitySpaceAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "MERCHANT") redirect("/community?error=Hanya+merchant+yang+dapat+membuat+ruang");
  const parsed = z.object({
    name: z.string().trim().min(3).max(80),
    description: z.string().trim().max(300).optional(),
    productId: z.string().uuid().optional(),
  }).safeParse({
    name: formData.get("name"), description: formData.get("description") || undefined,
    productId: formData.get("productId") || undefined,
  });
  if (!parsed.success) redirect("/community?error=Data+ruang+belum+valid");
  if (parsed.data.productId) {
    const [owned] = await db.select({ id: products.id }).from(products)
      .where(and(eq(products.id, parsed.data.productId), eq(products.merchantId, user.id))).limit(1);
    if (!owned) redirect("/community?error=Produk+tidak+ditemukan");
  }
  const [space] = await db.insert(communitySpaces).values({
    merchantId: user.id, productId: parsed.data.productId ?? null,
    name: parsed.data.name, description: parsed.data.description ?? null,
  }).returning();
  redirect(communityPath(space.id));
}

export async function createCommunityPostAction(formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({
    spaceId: z.string().uuid(), title: z.string().trim().min(4).max(140), content: z.string().trim().min(10).max(5000),
  }).safeParse({ spaceId: formData.get("spaceId"), title: formData.get("title"), content: formData.get("content") });
  if (!parsed.success) redirect("/community?error=Ruang,+judul,+atau+isi+postingan+belum+valid");
  const access = await getAccessibleCommunitySpace(user, parsed.data.spaceId);
  if (!access || access.space.isArchived) redirect("/community?error=Ruang+tidak+dapat+diakses");

  const image = formData.get("image");
  let storageKey: string | null = null;
  if (image instanceof File && image.size > 0) {
    const extension = imageTypes[image.type];
    if (!extension || image.size > 5 * 1024 * 1024) redirect(`${communityPath(access.space.id)}&error=Gambar+harus+JPG,+PNG,+atau+WebP+maksimal+5MB`);
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    if (!verifyUploadSignature(imageBuffer, image.type)) redirect(`${communityPath(access.space.id)}&error=Isi+file+gambar+tidak+valid`);
    storageKey = `${randomUUID()}${extension}`;
    await mkdir(communityMediaDirectory, { recursive: true });
    await writeFile(communityMediaPath(storageKey), imageBuffer, { flag: "wx" });
  }
  try {
    await db.insert(communityPosts).values({ authorId: user.id, spaceId: access.space.id, imageStorageKey: storageKey, title: parsed.data.title, content: parsed.data.content });
  } catch (error) {
    if (storageKey) await unlink(communityMediaPath(storageKey)).catch(() => undefined);
    throw error;
  }
  revalidatePath("/community");
}

export async function createCommunityCommentAction(postId: string, formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({ content: z.string().trim().min(2).max(1200) }).safeParse({ content: formData.get("content") });
  if (!parsed.success) redirect("/community?error=Komentar+belum+valid");
  const [post] = await db.select({ id: communityPosts.id, authorId: communityPosts.authorId, title: communityPosts.title, spaceId: communityPosts.spaceId })
    .from(communityPosts).where(and(eq(communityPosts.id, postId), eq(communityPosts.isHidden, false))).limit(1);
  if (!post?.spaceId || !(await getAccessibleCommunitySpace(user, post.spaceId))) redirect("/community?error=Postingan+tidak+ditemukan");
  const [comment] = await db.insert(communityComments).values({ postId, authorId: user.id, content: parsed.data.content }).returning({ id: communityComments.id });
  await createInAppNotification({
    userId: post.authorId, actorId: user.id, type: "COMMUNITY_REPLY", title: `Balasan baru: ${post.title}`,
    body: `${user.name} membalas postingan Anda.`, href: `${communityPath(post.spaceId)}#post-${post.id}`,
    dedupeKey: `community-comment:${comment.id}`,
  });
  revalidatePath("/community");
}

export async function toggleCommunityReactionAction(postId: string, reaction: string) {
  const user = await requireUser();
  const value = reactionSchema.parse(reaction);
  const [post] = await db.select({ authorId: communityPosts.authorId, title: communityPosts.title, spaceId: communityPosts.spaceId })
    .from(communityPosts).where(and(eq(communityPosts.id, postId), eq(communityPosts.isHidden, false))).limit(1);
  if (!post?.spaceId || !(await getAccessibleCommunitySpace(user, post.spaceId))) redirect("/community");
  const [existing] = await db.select().from(communityReactions).where(and(eq(communityReactions.postId, postId), eq(communityReactions.userId, user.id))).limit(1);
  if (existing?.reaction === value) await db.delete(communityReactions).where(eq(communityReactions.id, existing.id));
  else if (existing) await db.update(communityReactions).set({ reaction: value }).where(eq(communityReactions.id, existing.id));
  else {
    const [created] = await db.insert(communityReactions).values({ postId, userId: user.id, reaction: value }).returning({ id: communityReactions.id });
    await createInAppNotification({
      userId: post.authorId, actorId: user.id, type: "COMMUNITY_REACTION", title: `Reaksi baru: ${post.title}`,
      body: `${user.name} memberikan reaksi pada postingan Anda.`, href: `${communityPath(post.spaceId)}#post-${postId}`,
      dedupeKey: `community-reaction:${created.id}`,
    });
  }
  revalidatePath("/community");
}

export async function toggleCommunityPinAction(postId: string) {
  const user = await requireUser();
  const [post] = await db.select({ isPinned: communityPosts.isPinned, space: communitySpaces }).from(communityPosts)
    .innerJoin(communitySpaces, eq(communityPosts.spaceId, communitySpaces.id)).where(eq(communityPosts.id, postId)).limit(1);
  if (!post || !canModerateSpace(user, post.space)) redirect("/community");
  await db.update(communityPosts).set({ isPinned: !post.isPinned, updatedAt: new Date() }).where(eq(communityPosts.id, postId));
  revalidatePath("/community");
}

export async function toggleCommunityHiddenAction(postId: string) {
  const user = await requireUser();
  const [post] = await db.select({ isHidden: communityPosts.isHidden, space: communitySpaces }).from(communityPosts)
    .innerJoin(communitySpaces, eq(communityPosts.spaceId, communitySpaces.id)).where(eq(communityPosts.id, postId)).limit(1);
  if (!post || !canModerateSpace(user, post.space)) redirect("/community");
  await db.update(communityPosts).set({ isHidden: !post.isHidden, hiddenBy: post.isHidden ? null : user.id, hiddenAt: post.isHidden ? null : new Date(), updatedAt: new Date() }).where(eq(communityPosts.id, postId));
  revalidatePath("/community");
}

export async function reportCommunityContentAction(postId: string, commentId: string | null, formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({ reason: z.string().trim().min(5).max(500) }).safeParse({ reason: formData.get("reason") });
  if (!parsed.success) redirect("/community?error=Alasan+laporan+belum+valid");
  const [post] = await db.select({ spaceId: communityPosts.spaceId }).from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
  if (!post?.spaceId || !(await getAccessibleCommunitySpace(user, post.spaceId))) redirect("/community");
  if (commentId) {
    const [comment] = await db.select({ id: communityComments.id }).from(communityComments)
      .where(and(eq(communityComments.id, commentId), eq(communityComments.postId, postId))).limit(1);
    if (!comment) redirect("/community");
  }
  await db.insert(communityReports).values({ reporterId: user.id, postId: commentId ? null : postId, commentId, reason: parsed.data.reason });
  redirect(`${communityPath(post.spaceId)}&success=Laporan+terkirim`);
}

export async function reviewCommunityReportAction(reportId: string, decision: "resolve" | "dismiss", hide: boolean) {
  const user = await requireUser();
  const [report] = await db.select().from(communityReports).where(and(eq(communityReports.id, reportId), eq(communityReports.status, "OPEN"))).limit(1);
  if (!report) return;
  let target: { postId: string; commentId: string | null; space: typeof communitySpaces.$inferSelect } | undefined;
  if (report.postId) {
    const [row] = await db.select({ postId: communityPosts.id, space: communitySpaces }).from(communityPosts)
      .innerJoin(communitySpaces, eq(communityPosts.spaceId, communitySpaces.id)).where(eq(communityPosts.id, report.postId)).limit(1);
    if (row) target = { ...row, commentId: null };
  } else if (report.commentId) {
    const [row] = await db.select({ postId: communityPosts.id, commentId: communityComments.id, space: communitySpaces }).from(communityComments)
      .innerJoin(communityPosts, eq(communityComments.postId, communityPosts.id)).innerJoin(communitySpaces, eq(communityPosts.spaceId, communitySpaces.id)).where(eq(communityComments.id, report.commentId)).limit(1);
    target = row;
  }
  if (!target || !canModerateSpace(user, target.space)) redirect("/community");
  if (hide && decision === "resolve") {
    if (report.commentId) await db.update(communityComments).set({ isHidden: true, hiddenBy: user.id, hiddenAt: new Date() }).where(eq(communityComments.id, report.commentId));
    else if (report.postId) await db.update(communityPosts).set({ isHidden: true, hiddenBy: user.id, hiddenAt: new Date(), updatedAt: new Date() }).where(eq(communityPosts.id, report.postId));
  }
  await db.update(communityReports).set({ status: decision === "resolve" ? "RESOLVED" : "DISMISSED", reviewedBy: user.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(communityReports.id, report.id));
  revalidatePath("/community");
}
