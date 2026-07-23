import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { createProductVariantAction, deleteProductVariantAction, updateProductVariantAction } from "@/app/actions/pricing";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { productVariants, products } from "@/lib/schema";

export default async function ProductPricingPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }>;
}) {
  const merchant = await requireMerchant("manage");
  const { id } = await params;
  const { error } = await searchParams;
  const [product] = await db.select().from(products).where(and(eq(products.id, id), eq(products.merchantId, merchant.id))).limit(1);
  if (!product) notFound();
  const variants = await db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(asc(productVariants.position));
  return <main className="app-main"><div className="shell" style={{ maxWidth: 900 }}>
    <div className="page-head"><div><Link className="home-text-link" href="/dashboard/products">← Katalog</Link><h1 className="display" style={{ marginTop: 12 }}>Paket harga</h1><p>{product.name} · Jika tidak ada paket, checkout memakai harga utama {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(product.price)}.</p></div></div>
    {error && <p className="alert">{error}</p>}
    <div className="two-col"><section className="panel"><div className="panel-head"><h2>Pilihan checkout</h2><span className="badge">{variants.length}</span></div>
      {variants.length ? variants.map((variant) => <form className="form form-panel" action={updateProductVariantAction.bind(null, id, variant.id)} key={variant.id}>
        <div className="two-field"><div className="field"><label>Nama paket</label><input className="input" name="name" defaultValue={variant.name} required /></div><div className="field"><label>Harga</label><input className="input" name="price" type="number" defaultValue={variant.price} min={10000} required /></div></div>
        <div className="field"><label>Stok/kuota</label><input className="input" name="stock" type="number" min={0} defaultValue={variant.stock ?? ""} placeholder="Kosong = tanpa batas" /></div>
        <label className="check-field"><input type="checkbox" name="isActive" defaultChecked={variant.isActive} /><span>Tampilkan di checkout</span></label>
        <div className="actions"><button className="btn" type="submit">Simpan</button><button className="btn btn-danger" formAction={deleteProductVariantAction.bind(null, id, variant.id)}>Hapus</button></div>
      </form>) : <div className="empty"><p>Belum ada paket harga. Harga utama tetap dapat dibeli.</p></div>}
    </section><aside className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Tambah paket</h2></div>
      <form className="form" action={createProductVariantAction.bind(null, id)}><div className="field"><label htmlFor="variant-name">Nama paket</label><input className="input" id="variant-name" name="name" required placeholder="Contoh: Premium" /></div><div className="field"><label htmlFor="variant-price">Harga</label><input className="input" id="variant-price" name="price" type="number" min={10000} required /></div><div className="field"><label htmlFor="variant-stock">Stok/kuota</label><input className="input" id="variant-stock" name="stock" type="number" min={0} placeholder="Kosong = tanpa batas" /></div><button className="btn btn-primary" type="submit">Tambah paket</button></form>
    </aside></div>
  </div></main>;
}
