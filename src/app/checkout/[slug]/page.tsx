import Link from "next/link";
import { notFound } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { checkoutAction } from "@/app/actions/checkout";
import { Brand } from "@/components/brand";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { products } from "@/lib/schema";

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { slug } = await params;
  const { error } = await searchParams;
  const [product] = await db.select({ name: products.name, headline: products.headline, price: products.price, slug: products.slug }).from(products).where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"))).limit(1);
  if (!product) notFound();
  const action = checkoutAction.bind(null, product.slug);
  return <main className="auth-wrap"><aside className="auth-aside"><Brand inverse /><div><span className="eyebrow">Checkout aman</span><h1 className="display" style={{marginTop:18}}>{product.name}</h1><p>{product.headline}</p><div className="price" style={{color:"var(--lime)"}}>{formatRupiah(product.price)}</div></div><small><LockKeyhole size={14} style={{display:"inline",verticalAlign:"middle"}} /> Pembayaran diproses oleh Xendit</small></aside><section className="auth-main"><div className="auth-card"><Link className="muted" href={`/p/${product.slug}`}>← Kembali ke produk</Link><h2 className="display" style={{marginTop:24}}>Data pembeli</h2><p>Akun member digunakan untuk mengakses kursus.</p>{error && <p className="alert">{error}</p>}<form className="form" action={action}><div className="field"><label htmlFor="name">Nama lengkap</label><input className="input" id="name" name="name" required minLength={2} autoComplete="name" /></div><div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div><div className="field"><label htmlFor="password">Password akun member</label><input className="input" id="password" name="password" type="password" minLength={8} required autoComplete="new-password" /><small className="muted">Jika email sudah terdaftar, masukkan password akun tersebut.</small></div><button className="btn btn-primary" type="submit">Lanjut bayar {formatRupiah(product.price)}</button></form></div></section></main>;
}
