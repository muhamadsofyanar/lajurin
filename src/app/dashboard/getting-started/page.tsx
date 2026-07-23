import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { merchantManualPaymentAccounts, merchantProfiles, orders, products } from "@/lib/schema";

export default async function GettingStartedPage() {
  const merchant = await requireMerchant();
  const [[profile], [account], [productTotal], [publishedTotal], [paidTotal]] = await Promise.all([
    db.select().from(merchantProfiles).where(eq(merchantProfiles.userId, merchant.id)).limit(1),
    db.select().from(merchantManualPaymentAccounts).where(and(eq(merchantManualPaymentAccounts.merchantId, merchant.id), eq(merchantManualPaymentAccounts.isActive, true))).limit(1),
    db.select({ value: count() }).from(products).where(eq(products.merchantId, merchant.id)),
    db.select({ value: count() }).from(products).where(and(eq(products.merchantId, merchant.id), eq(products.status, "PUBLISHED"))),
    db.select({ value: count() }).from(orders).innerJoin(products, eq(orders.productId, products.id))
      .where(and(eq(products.merchantId, merchant.id), eq(orders.status, "PAID"))),
  ]);
  const steps = [
    { done: Boolean(profile?.headline && profile?.bio && profile?.supportEmail), title: "Lengkapi identitas toko", copy: "Nama brand, deskripsi, kontak, logo, dan warna.", href: "/dashboard/profile" },
    { done: productTotal.value > 0, title: "Buat produk pertama", copy: "Pilih kursus, produk digital, atau jasa.", href: "/dashboard/products/new" },
    { done: Boolean(account), title: "Aktifkan rekening pembayaran", copy: "Terima transfer langsung sambil menunggu payment gateway.", href: "/dashboard/payments" },
    { done: publishedTotal.value > 0, title: "Terbitkan produk", copy: "Lengkapi isi produk dan landing page sebelum dipublikasikan.", href: "/dashboard/products" },
    { done: paidTotal.value > 0, title: "Dapatkan penjualan pertama", copy: "Bagikan halaman toko atau landing page produk.", href: profile?.slug ? `/m/${profile.slug}` : "/dashboard/profile" },
  ];
  const completed = steps.filter((step) => step.done).length;
  return <main className="app-main"><div className="shell" style={{ maxWidth: 900 }}>
    <div className="page-head"><div><span className="badge">{completed}/{steps.length} SELESAI</span><h1 className="display">Mulai berjualan</h1><p>Checklist ini mengikuti kondisi akun secara otomatis.</p></div></div>
    <section className="panel"><div className="panel-head"><h2>Langkah utama</h2><span className="muted">{Math.round(completed / steps.length * 100)}%</span></div>
      {steps.map((step, index) => <div className="table-row" key={step.title}><div><strong>{step.done ? "✓" : index + 1}. {step.title}</strong><small>{step.copy}</small></div><div className="row-action"><span className={`badge ${step.done ? "badge-live" : ""}`}>{step.done ? "Selesai" : "Belum"}</span><Link className="btn btn-compact" href={step.href}>{step.done ? "Periksa" : "Kerjakan"}</Link></div></div>)}
    </section>
  </div></main>;
}
