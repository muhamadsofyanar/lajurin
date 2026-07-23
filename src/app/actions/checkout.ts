"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { calculateDiscount } from "@/lib/discount";
import { calculateOrderAccounting, DEFAULT_PLATFORM_FEE_BPS } from "@/lib/finance";
import { featureEnabled } from "@/lib/feature-flags";
import { findValidCoupon } from "@/lib/funnel";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { createPaymentSession } from "@/lib/xendit";
import { dispatchOrderNotifications } from "@/lib/notifications";
import { affiliatePartners, affiliatePrograms, analyticsEvents, courses, merchantManualPaymentAccounts, merchantProfiles, orders, platformSettings, productFunnels, products, productVariants, serviceCases, users } from "@/lib/schema";
import { currentRequestIdentity, enforceRateLimit } from "@/lib/security";

export async function checkoutAction(slug: string, formData: FormData) {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.string().email().transform((value) => value.toLowerCase().trim()),
      phone: z.string().trim().regex(/^\+?[0-9\s().-]{9,20}$/).transform((value) => value.replace(/[^0-9+]/g, "")),
      password: z.string().min(8).max(128),
      variantId: z.union([z.literal(""), z.string().uuid()]).optional(),
      paymentMethod: z.enum(["XENDIT", "MANUAL_TRANSFER"]).default("MANUAL_TRANSFER"),
      couponCode: z.string().trim().max(24).optional(),
      orderBump: z.preprocess((value) => value === "on", z.boolean()),
      marketingConsent: z.preprocess((value) => value === "on", z.boolean()),
      utmSource: z.string().trim().max(100).optional(),
      utmMedium: z.string().trim().max(100).optional(),
      utmCampaign: z.string().trim().max(120).optional(),
      affiliateCode: z.string().trim().max(48).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/checkout/${slug}?error=Periksa+kembali+data+Anda`);

  const rateLimitKey = await currentRequestIdentity("checkout", `${slug}:${parsed.data.email}`);
  const rateLimit = await enforceRateLimit(rateLimitKey, { limit: 8, windowMs: 15 * 60_000, blockMs: 30 * 60_000 });
  if (rateLimit.limited) redirect(`/checkout/${slug}?error=Terlalu+banyak+percobaan+checkout.+Coba+lagi+dalam+30+menit`);

  const [product] = await db.select({ product: products, courseId: courses.id, merchantFeeBps: merchantProfiles.platformFeeBps }).from(products)
    .innerJoin(courses, eq(courses.productId, products.id))
    .innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"), eq(merchantProfiles.status, "ACTIVE"))).limit(1);
  if (!product) redirect("/");
  const [variant] = parsed.data.variantId ? await db.select().from(productVariants).where(and(
    eq(productVariants.id, parsed.data.variantId),
    eq(productVariants.productId, product.product.id),
    eq(productVariants.isActive, true),
    or(isNull(productVariants.stock), gt(productVariants.stock, 0)),
  )).limit(1) : [];
  if (parsed.data.variantId && (!variant || variant.stock === 0)) redirect(`/checkout/${slug}?error=Paket+harga+sudah+tidak+tersedia`);
  const primaryPrice = variant?.price ?? product.product.price;

  const directManualEnabled = parsed.data.paymentMethod === "MANUAL_TRANSFER" && await featureEnabled("DIRECT_MANUAL_PAYMENTS", product.product.merchantId);
  const [manualAccount] = directManualEnabled
    ? await db.select().from(merchantManualPaymentAccounts).where(and(
        eq(merchantManualPaymentAccounts.merchantId, product.product.merchantId),
        eq(merchantManualPaymentAccounts.isActive, true),
      )).limit(1)
    : [];

  const [funnel] = await db.select().from(productFunnels).where(and(eq(productFunnels.productId, product.product.id), eq(productFunnels.isActive, true))).limit(1);
  let bumpProduct: typeof product.product | null = null;
  if (parsed.data.orderBump && funnel?.orderBumpProductId) {
    const [candidate] = await db.select().from(products).where(and(
      eq(products.id, funnel.orderBumpProductId),
      eq(products.merchantId, product.product.merchantId),
      eq(products.status, "PUBLISHED"),
    )).limit(1);
    bumpProduct = candidate ?? null;
  }
  const coupon = await findValidCoupon(product.product.id, parsed.data.couponCode);
  const discountAmount = coupon ? calculateDiscount(primaryPrice, coupon.discountType, coupon.discountValue) : 0;
  const bumpAmount = bumpProduct?.price ?? 0;
  const subtotalAmount = primaryPrice + bumpAmount;
  const finalAmount = subtotalAmount - discountAmount;
  const [settings] = await db.select({ defaultFeeBps: platformSettings.defaultPlatformFeeBps })
    .from(platformSettings).where(eq(platformSettings.id, 1)).limit(1);
  const accounting = calculateOrderAccounting(finalAmount, product.merchantFeeBps ?? settings?.defaultFeeBps ?? DEFAULT_PLATFORM_FEE_BPS);
  const [affiliate] = parsed.data.affiliateCode ? await db.select({ id: affiliatePartners.id })
    .from(affiliatePartners)
    .innerJoin(affiliatePrograms, eq(affiliatePrograms.id, affiliatePartners.programId))
    .where(and(
      eq(affiliatePartners.code, parsed.data.affiliateCode),
      eq(affiliatePartners.status, "ACTIVE"),
      eq(affiliatePrograms.productId, product.product.id),
      eq(affiliatePrograms.isActive, true),
    )).limit(1) : [];

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
      productVariantId: variant?.id ?? null,
      productVariantName: variant?.name ?? null,
      customerId: customer.id,
      customerName: parsed.data.name,
      customerEmail: parsed.data.email,
      customerPhone: parsed.data.phone,
      marketingConsent: parsed.data.marketingConsent,
      marketingConsentAt: parsed.data.marketingConsent ? new Date() : null,
      marketingConsentSource: parsed.data.marketingConsent ? "CHECKOUT" : null,
      amount: finalAmount,
      subtotalAmount,
      discountAmount,
      couponId: coupon?.id ?? null,
      couponCode: coupon?.code ?? null,
      orderBumpProductId: bumpProduct?.id ?? null,
      orderBumpAmount: bumpAmount,
      utmSource: parsed.data.utmSource || null,
      utmMedium: parsed.data.utmMedium || null,
      utmCampaign: parsed.data.utmCampaign || null,
      affiliatePartnerId: affiliate?.id ?? null,
      paymentMethod: parsed.data.paymentMethod,
      ...accounting,
      settlementMode: manualAccount ? "MERCHANT_DIRECT" : "PLATFORM",
      manualDestinationBank: manualAccount?.bankName ?? null,
      manualDestinationAccount: manualAccount?.accountNumber ?? null,
      manualDestinationHolder: manualAccount?.accountHolder ?? null,
    }).returning();

  if (variant?.stock !== null && variant?.stock !== undefined) {
    const [reserved] = await db.update(productVariants).set({
      stock: variant.stock - 1, updatedAt: new Date(),
    }).where(and(eq(productVariants.id, variant.id), gt(productVariants.stock, 0))).returning({ id: productVariants.id });
    if (!reserved) {
      await db.delete(orders).where(eq(orders.id, order.id));
      redirect(`/checkout/${slug}?error=Kuota+paket+baru+saja+habis`);
    }
  }

  if (product.product.type === "SERVICE") {
    await db.insert(serviceCases).values({
      orderId: order.id,
      merchantId: product.product.merchantId,
      customerId: customer.id,
      status: "WAITING_PAYMENT",
    });
  }

  await db.insert(analyticsEvents).values({
    productId: product.product.id,
    orderId: order.id,
    event: "CHECKOUT_STARTED",
    utmSource: parsed.data.utmSource || null,
    utmMedium: parsed.data.utmMedium || null,
    utmCampaign: parsed.data.utmCampaign || null,
  }).onConflictDoNothing({ target: [analyticsEvents.orderId, analyticsEvents.event] });

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
      amount: finalAmount,
      customerName: parsed.data.name,
      customerEmail: parsed.data.email,
      productName: `${product.product.name}${variant ? ` — ${variant.name}` : ""}${bumpProduct ? ` + ${bumpProduct.name}` : ""}`,
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
