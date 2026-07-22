"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { inAppNotifications } from "@/lib/schema";

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireUser();
  await db.update(inAppNotifications).set({ readAt: new Date() }).where(and(eq(inAppNotifications.id, notificationId), eq(inAppNotifications.userId, user.id)));
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await db.update(inAppNotifications).set({ readAt: new Date() }).where(and(eq(inAppNotifications.userId, user.id), isNull(inAppNotifications.readAt)));
  revalidatePath("/notifications");
}
