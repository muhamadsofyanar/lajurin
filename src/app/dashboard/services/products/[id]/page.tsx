import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { togglePublishAction, updateProductAction } from "@/app/actions/product";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/schema";

export default async function ServiceProductPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const merchant = await requireMerchant("manage");
  const { id } = await params;
  const { error } = await searchParams;
  const [product] = await db.select().from(products)
    .where(and(eq(products.id, id), eq(products.merchantId, merchant.id), eq(products.type, "SERVICE"))).limit(1);
  if (!product) notFound();

  return <main className="app-main"><div className="shell" style={{ maxWidth: 860 }}>
    <div className="page-head"><div><span className="badge">PRODUK JASA</span><h1 className="display">{product.name}</h1><p>Atur penawaran jasa. Pengerjaan klien dikelola melalui menu Layanan.</p></div><div className="actions"><Link className="btn" href={`/dashboard/products/${product.id}/landing`}>Landing page</Link><Link className="btn" href={`/dashboard/products/${product.id}/funnel`}>Kupon & funnel</Link><form action={togglePublishAction.bind(null, product.id)}><button className={`btn ${product.status === "PUBLISHED" ? "btn-danger" : "btn-lime"}`} type="submit">{product.status === "PUBLISHED" ? "Jadikan draf" : "Terbitkan"}</button></form></div></div>
    {error && <p className="alert">{error}</p>}
    <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Informasi layanan</h2><span className={`badge status-${product.status.toLowerCase()}`}>{product.status}</span></div>
      <form className="form" action={updateProductAction.bind(null, product.id)}>
        <input type="hidden" name="type" value="SERVICE" />
        <div className="field"><label htmlFor="name">Nama layanan</label><input className="input" id="name" name="name" defaultValue={product.name} required minLength={3} /></div>
        <div className="field"><label htmlFor="headline">Hasil utama</label><input className="input" id="headline" name="headline" defaultValue={product.headline} required minLength={10} /></div>
        <div className="field"><label htmlFor="description">Cakupan dan proses</label><textarea className="input" id="description" name="description" defaultValue={product.description} required minLength={20} /></div>
        <div className="field"><label htmlFor="price">Harga</label><input className="input" id="price" name="price" type="number" defaultValue={product.price} min={10000} step={1000} required /></div>
        <button className="btn btn-primary" type="submit">Simpan perubahan</button>
      </form>
    </section>
  </div></main>;
}
