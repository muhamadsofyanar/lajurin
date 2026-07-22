"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { createPaymentSession } from "@/lib/xendit";
import { dispatchOrderNotifications } from "@/lib/notifications";
import { courses, orders, products, users } from "@/lib/schema";

export async function checkoutAction(slug: string, formData: FormData) {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.string().email().transform((value) => value.toLowerCase().trim()),
      phone: z.string().trim().regex(/^\+?[0-9\s().-]{9,20}$/).transform((value) => value.replace(/[^0-9+]/g, "")),
      password: z.string().min(8).max(128),
      paymentMethod: z.enum(["XENDIT", "MANUAL_TRANSFER"]).default("MANUAL_TRANSFER"),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/checkout/${slug}?error=Periksa+kembali+data+Anda`);

  const [product] = await db.select({ product: products, courseId: courses.id }).from(products).innerJoin(courses, eq(courses.productId, products.id)).where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"))).limit(1);
  if (!product) redirect("/");

  let [customer] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (customer) {
    const passwordValid = await verifyPassword(parsed.data.password, customer.passwordHash);
    if (!passwordValid) redirect(`/checkout/${slug}?error=Password+akun+tidak+sesuai`);
  } else {
    [customer] = await db.insert(users).values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        role: "MEMBER",
      }).returning();
  }

  const externalId = `LJR-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [order] = await db.insert(orders).values({
      externalId,
      productId: product.product.id,
      customerId: customer.id,
      customerName: parsed.data.name,
      customerEmail: parsed.data.email,
      customerPhone: parsed.data.phone,
      amount: product.product.price,
      paymentMethod: parsed.data.paymentMethod,
    }).returning();

  await createSession(customer.id);

  if (parsed.data.paymentMethod === "MANUAL_TRANSFER") {
    await dispatchOrderNotifications(order.id, "ORDER_CREATED");
    redirect(`/payment/manual/${order.id}`);
  }

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  let paymentSession;
  try {
    paymentSession = await createPaymentSession({
      externalId,
      customerId: customer.id,
      amount: product.product.price,
      customerName: parsed.data.name,
      customerEmail: parsed.data.email,
      productName: product.product.name,
      productUrl: `${appUrl}/p/${product.product.slug}`,
      successUrl: `${appUrl}/payment/success?order=${order.id}`,
      failureUrl: `${appUrl}/checkout/${product.product.slug}?error=Pembayaran+belum+berhasil`,
    });
  } catch {
    await db.update(orders).set({ status: "FAILED", updatedAt: new Date() }).where(eq(orders.id, order.id));
    redirect(`/checkout/${slug}?error=Layanan+pembayaran+belum+tersedia`);
  }

  await db.update(orders).set({ xenditSessionId: paymentSession.payment_session_id, xenditPaymentUrl: paymentSession.payment_link_url, updatedAt: new Date() }).where(eq(orders.id, order.id));
  await dispatchOrderNotifications(order.id, "ORDER_CREATED");
  redirect(paymentSession.payment_link_url);
}
