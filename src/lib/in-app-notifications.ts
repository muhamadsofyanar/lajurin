import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { inAppNotifications } from "@/lib/schema";

export async function createInAppNotification(input: {
  userId: string;
  actorId?: string | null;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  dedupeKey?: string | null;
}) {
  if (input.actorId && input.actorId === input.userId) return null;
  const [created] = await db.insert(inAppNotifications).values(input)
    .onConflictDoNothing({ target: inAppNotifications.dedupeKey }).returning();
  return created ?? null;
}

export async function unreadNotificationCount(userId: string) {
  const [row] = await db.select({ value: count() }).from(inAppNotifications)
    .where(and(eq(inAppNotifications.userId, userId), isNull(inAppNotifications.readAt)));
  return Number(row?.value ?? 0);
}
