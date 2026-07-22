"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { automationRules, products } from "@/lib/schema";

export async function createAutomationRuleAction(formData: FormData) {
  const merchant = await requireMerchant();
  const parsed = z.object({
    name: z.string().trim().min(3).max(100),
    trigger: z.enum(["PURCHASED", "COURSE_COMPLETED"]),
    productId: z.string().uuid().optional(),
    emailSubject: z.string().trim().max(160).optional(),
    messageTemplate: z.string().trim().min(10).max(3000),
    sendEmail: z.boolean(), sendWhatsapp: z.boolean(),
  }).safeParse({
    name: formData.get("name"), trigger: formData.get("trigger"), productId: formData.get("productId") || undefined,
    emailSubject: formData.get("emailSubject") || undefined, messageTemplate: formData.get("messageTemplate"),
    sendEmail: formData.get("sendEmail") === "on", sendWhatsapp: formData.get("sendWhatsapp") === "on",
  });
  if (!parsed.success || (!parsed.data.sendEmail && !parsed.data.sendWhatsapp)) redirect("/dashboard/automation?error=Lengkapi+aturan+dan+pilih+minimal+satu+kanal");
  if (parsed.data.productId) {
    const [owned] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, parsed.data.productId), eq(products.merchantId, merchant.id))).limit(1);
    if (!owned) redirect("/dashboard/automation?error=Produk+tidak+ditemukan");
  }
  await db.insert(automationRules).values({
    merchantId: merchant.id, productId: parsed.data.productId ?? null, name: parsed.data.name, trigger: parsed.data.trigger,
    sendEmail: parsed.data.sendEmail, sendWhatsapp: parsed.data.sendWhatsapp,
    emailSubject: parsed.data.emailSubject ?? null, messageTemplate: parsed.data.messageTemplate,
  });
  redirect("/dashboard/automation?success=Automation+berhasil+dibuat");
}

export async function toggleAutomationRuleAction(ruleId: string) {
  const merchant = await requireMerchant();
  const [rule] = await db.select({ isActive: automationRules.isActive }).from(automationRules)
    .where(and(eq(automationRules.id, ruleId), eq(automationRules.merchantId, merchant.id))).limit(1);
  if (!rule) redirect("/dashboard/automation");
  await db.update(automationRules).set({ isActive: !rule.isActive, updatedAt: new Date() }).where(eq(automationRules.id, ruleId));
  revalidatePath("/dashboard/automation");
}
