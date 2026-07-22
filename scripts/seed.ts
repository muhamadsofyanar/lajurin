import "dotenv/config";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db, pool } from "../src/lib/db";
import { courses, lessons, products, users } from "../src/lib/schema";

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@lajurin.id").toLowerCase();
  if (!process.env.SEED_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD wajib diisi minimal 12 karakter.");
  }
  const passwordHash = await hash(process.env.SEED_ADMIN_PASSWORD, 12);
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const [admin] = existing
    ? await db.update(users).set({ role: "ADMIN", updatedAt: new Date() }).where(eq(users.id, existing.id)).returning()
    : await db.insert(users).values({ name: "Admin Lajurin", email, passwordHash, role: "ADMIN" }).returning();

  const [existingProduct] = await db.select().from(products).where(eq(products.slug, "kelas-jualan-digital")).limit(1);
  if (!existingProduct) {
    const [product] = await db.insert(products).values({
      merchantId: admin.id, name: "Kelas Jualan Digital", slug: "kelas-jualan-digital",
      headline: "Bangun produk digital pertama yang benar-benar siap dijual",
      description: "Pelajari validasi ide, pembuatan produk, landing page, dan strategi peluncuran dalam satu kelas praktis.",
      price: 149000, status: "PUBLISHED",
    }).returning();
    const [course] = await db.insert(courses).values({ productId: product.id, title: product.name, description: product.description }).returning();
    await db.insert(lessons).values([
      { courseId: course.id, title: "Mulai dari masalah pelanggan", content: "Temukan masalah yang mendesak dan spesifik sebelum membuat produk.", position: 1 },
      { courseId: course.id, title: "Susun penawaran", content: "Gabungkan hasil, mekanisme, bonus, dan jaminan menjadi penawaran yang jelas.", position: 2 },
    ]);
  }
}

main().finally(() => pool.end());
