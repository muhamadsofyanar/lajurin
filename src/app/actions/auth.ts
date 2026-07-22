"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { merchantProfiles, users } from "@/lib/schema";
import { clearRateLimit, currentRequestIdentity, enforceRateLimit } from "@/lib/security";
import {
  createSession,
  deleteSession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

const credentialsSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8).max(128),
});

export async function loginAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=Email+atau+password+tidak+valid");

  const rateLimitKey = await currentRequestIdentity("login", parsed.data.email);
  const rateLimit = await enforceRateLimit(rateLimitKey, { limit: 5, windowMs: 15 * 60_000, blockMs: 15 * 60_000 });
  if (rateLimit.limited) redirect("/login?error=Terlalu+banyak+percobaan.+Coba+lagi+dalam+15+menit");

  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    redirect("/login?error=Email+atau+password+salah");
  }

  await clearRateLimit(rateLimitKey);
  await createSession(user.id);
  redirect(user.role === "ADMIN" ? "/admin" : user.role === "MEMBER" ? "/member" : "/dashboard");
}

export async function registerAction(formData: FormData) {
  const rateLimitKey = await currentRequestIdentity("register");
  const rateLimit = await enforceRateLimit(rateLimitKey, { limit: 5, windowMs: 60 * 60_000, blockMs: 60 * 60_000 });
  if (rateLimit.limited) redirect("/register?error=Terlalu+banyak+pendaftaran+dari+perangkat+ini.+Coba+lagi+nanti");
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z.string().email().transform((value) => value.toLowerCase().trim()),
      password: z.string().min(8).max(128),
    })
    .safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success) redirect("/register?error=Periksa+kembali+data+pendaftaran");
  const passwordHash = await hashPassword(parsed.data.password);
  const user = await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "MERCHANT",
      }).onConflictDoNothing({ target: users.email }).returning();
    if (!created) return null;
    await tx.insert(merchantProfiles).values({
      userId: created.id,
      brandName: created.name,
      slug: `${slugify(created.name) || "toko"}-${created.id.slice(0, 6)}`,
      supportEmail: created.email,
    });
    return created;
  });

  if (!user) redirect("/login?error=Email+sudah+terdaftar");

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/");
}
