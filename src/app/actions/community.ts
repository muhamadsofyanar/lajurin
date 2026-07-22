"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { communityComments, communityPosts, enrollments } from "@/lib/schema";

async function requireCommunityMember() {
  const user = await requireUser();
  if (user.role === "MEMBER") {
    const [{ value }] = await db.select({ value: count() }).from(enrollments).where(eq(enrollments.userId, user.id));
    if (!value) redirect("/member?error=Komunitas+tersedia+setelah+Anda+memiliki+kursus");
  }
  return user;
}

export async function createCommunityPostAction(formData: FormData) {
  const user = await requireCommunityMember();
  const parsed = z.object({ title: z.string().trim().min(4).max(140), content: z.string().trim().min(10).max(5000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/community?error=Judul+atau+isi+postingan+belum+valid");
  await db.insert(communityPosts).values({ authorId: user.id, ...parsed.data });
  revalidatePath("/community");
}

export async function createCommunityCommentAction(postId: string, formData: FormData) {
  const user = await requireCommunityMember();
  const parsed = z.object({ content: z.string().trim().min(2).max(1200) }).safeParse({ content: formData.get("content") });
  if (!parsed.success) redirect("/community?error=Komentar+belum+valid");
  const [post] = await db.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
  if (!post) redirect("/community?error=Postingan+tidak+ditemukan");
  await db.insert(communityComments).values({ postId, authorId: user.id, content: parsed.data.content });
  revalidatePath("/community");
}

export async function toggleCommunityPinAction(postId: string) {
  const user = await requireCommunityMember();
  if (user.role === "MEMBER") redirect("/community");
  const [post] = await db.select({ isPinned: communityPosts.isPinned }).from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
  if (!post) return;
  await db.update(communityPosts).set({ isPinned: !post.isPinned, updatedAt: new Date() }).where(eq(communityPosts.id, postId));
  revalidatePath("/community");
}
