"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookingAppointments, bookingSlots, orders, products } from "@/lib/schema";

export async function createBookingSlotAction(formData: FormData) {
  const merchant = await requireMerchant("manage");
  const parsed = z.object({
    productId: z.string().uuid(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    capacity: z.coerce.number().int().min(1).max(500),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt) redirect("/dashboard/bookings?error=Jadwal+tidak+valid");
  const [product] = await db.select({ id: products.id }).from(products).where(and(
    eq(products.id, parsed.data.productId), eq(products.merchantId, merchant.id), eq(products.type, "SERVICE"),
  )).limit(1);
  if (!product) redirect("/dashboard/bookings?error=Produk+jasa+tidak+ditemukan");
  await db.insert(bookingSlots).values(parsed.data);
  revalidatePath("/dashboard/bookings");
  revalidatePath("/member/bookings");
  redirect("/dashboard/bookings?success=Jadwal+berhasil+dibuat");
}

export async function reserveBookingAction(orderId: string, slotId: string) {
  const user = await requireUser();
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`booking:${orderId}`}))`);
      const [order] = await tx.select({ productId: orders.productId }).from(orders).where(and(
        eq(orders.id, orderId), eq(orders.customerId, user.id), eq(orders.status, "PAID"),
      )).limit(1);
      if (!order) throw new Error("ORDER_INVALID");
      const [existing] = await tx.select({ id: bookingAppointments.id }).from(bookingAppointments).where(eq(bookingAppointments.orderId, orderId)).limit(1);
      if (existing) throw new Error("ALREADY_BOOKED");
      const [reserved] = await tx.update(bookingSlots).set({
        bookedCount: sql`${bookingSlots.bookedCount} + 1`, updatedAt: new Date(),
      }).where(and(
        eq(bookingSlots.id, slotId), eq(bookingSlots.productId, order.productId),
        eq(bookingSlots.isActive, true), gt(bookingSlots.startsAt, new Date()),
        sql`${bookingSlots.bookedCount} < ${bookingSlots.capacity}`,
      )).returning({ id: bookingSlots.id });
      if (!reserved) throw new Error("SLOT_FULL");
      await tx.insert(bookingAppointments).values({ slotId, orderId, customerId: user.id });
    });
  } catch (error) {
    const message = error instanceof Error && error.message === "ALREADY_BOOKED" ? "Pesanan+ini+sudah+memiliki+jadwal" : "Jadwal+tidak+tersedia+atau+sudah+penuh";
    redirect(`/member/bookings?error=${message}`);
  }
  revalidatePath("/member/bookings");
  revalidatePath("/dashboard/bookings");
  redirect("/member/bookings?success=Jadwal+berhasil+dipesan");
}
