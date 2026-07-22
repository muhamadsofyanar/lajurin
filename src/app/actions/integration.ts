"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { retryNotificationDelivery } from "@/lib/notifications";

export async function retryNotificationAction(deliveryId: string) {
  await requireAdmin();
  const success = await retryNotificationDelivery(deliveryId);
  revalidatePath("/admin/integrations");
  redirect(success
    ? "/admin/integrations?success=Notifikasi+berhasil+dikirim+ulang"
    : "/admin/integrations?error=Notifikasi+belum+dapat+dikirim+ulang");
}
