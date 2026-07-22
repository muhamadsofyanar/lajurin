import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canModerateSpace, getAccessibleCommunitySpace } from "@/lib/community";
import { db } from "@/lib/db";
import { communityPosts } from "@/lib/schema";
import { communityMediaPath } from "@/lib/storage";

const mimeByExtension: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { postId } = await params;
  const [post] = await db.select({ spaceId: communityPosts.spaceId, storageKey: communityPosts.imageStorageKey, isHidden: communityPosts.isHidden }).from(communityPosts)
    .where(eq(communityPosts.id, postId)).limit(1);
  const access = post?.spaceId ? await getAccessibleCommunitySpace(user, post.spaceId) : null;
  if (!post?.storageKey || !access || (post.isHidden && !canModerateSpace(user, access.space))) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(communityMediaPath(post.storageKey));
    const extension = post.storageKey.split(".").pop()?.toLowerCase() ?? "";
    return new Response(data, { headers: { "content-type": mimeByExtension[extension] ?? "application/octet-stream", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
