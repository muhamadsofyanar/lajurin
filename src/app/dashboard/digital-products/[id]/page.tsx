import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { deleteDigitalProductFileAction, uploadDigitalProductFileAction } from "@/app/actions/digital-product";
import { togglePublishAction, updateProductAction } from "@/app/actions/product";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { productFiles, products } from "@/lib/schema";
import { formatFileSize } from "@/lib/services";

export default async function DigitalProductPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }>;
}) {
  const merchant = await requireMerchant("manage");
  const { id } = await params;
  const { error } = await searchParams;
  const [product] = await db.select().from(products)
    .where(and(eq(products.id, id), eq(products.merchantId, merchant.id), eq(products.type, "DIGITAL"))).limit(1);
  if (!product) notFound();
  const files = await db.select().from(productFiles).where(eq(productFiles.productId, id)).orderBy(asc(productFiles.createdAt));

  return <main className="app-main"><div className="shell" style={{ maxWidth: 900 }}>
    <div className="page-head"><div><span className="badge">PRODUK DIGITAL</span><h1 className="display">{product.name}</h1><p>File hanya dapat diunduh pembeli setelah pembayaran berstatus lunas.</p></div><div className="actions"><Link className="btn" href={`/dashboard/products/${id}/landing`}>Landing page</Link><Link className="btn" href={`/dashboard/products/${id}/funnel`}>Kupon & funnel</Link><form action={togglePublishAction.bind(null, id)}><button className={`btn ${product.status === "PUBLISHED" ? "btn-danger" : "btn-lime"}`} type="submit">{product.status === "PUBLISHED" ? "Jadikan draf" : "Terbitkan"}</button></form></div></div>
    {error && <p className="alert">{error}</p>}
    <div className="two-col"><section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Informasi produk</h2><span className={`badge status-${product.status.toLowerCase()}`}>{product.status}</span></div>
      <form className="form" action={updateProductAction.bind(null, id)}>
        <input type="hidden" name="type" value="DIGITAL" />
        <div className="field"><label htmlFor="name">Nama produk</label><input className="input" id="name" name="name" defaultValue={product.name} required minLength={3} /></div>
        <div className="field"><label htmlFor="headline">Hasil utama</label><input className="input" id="headline" name="headline" defaultValue={product.headline} required minLength={10} /></div>
        <div className="field"><label htmlFor="description">Deskripsi</label><textarea className="input" id="description" name="description" defaultValue={product.description} required minLength={20} /></div>
        <div className="field"><label htmlFor="price">Harga</label><input className="input" id="price" name="price" type="number" defaultValue={product.price} min={10000} step={1000} required /></div>
        <button className="btn btn-primary" type="submit">Simpan perubahan</button>
      </form>
    </section><aside className="stack"><section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>File pembeli</h2><span className="badge">{files.length}</span></div>
      <form className="form" action={uploadDigitalProductFileAction.bind(null, id)}>
        <div className="field"><label htmlFor="file">Pilih file</label><input className="input" id="file" name="file" type="file" accept=".pdf,.zip,.epub,.mp3,.mp4,.webm" required /><small className="field-hint">PDF, ZIP, EPUB, MP3, MP4, atau WEBM. Maksimal 50 MB per file.</small></div>
        <button className="btn" type="submit">Upload file</button>
      </form>
      <div className="stack" style={{ marginTop: 20 }}>{files.map((file) => <div className="attachment-row" key={file.id}><span><strong>{file.fileName}</strong><small>{formatFileSize(file.size)}</small></span><form action={deleteDigitalProductFileAction.bind(null, file.id)}><button className="btn btn-compact btn-danger" type="submit">Hapus</button></form></div>)}{!files.length && <p className="muted">Upload minimal satu file sebelum produk diterbitkan.</p>}</div>
    </section></aside></div>
  </div></main>;
}
