import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { submitProductReviewAction } from "@/app/actions/review";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, productReviews, products } from "@/lib/schema";

export default async function ReviewOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;
  const [row] = await db.select({ order: orders, product: products, review: productReviews }).from(orders)
    .innerJoin(products, eq(products.id, orders.productId)).leftJoin(productReviews, eq(productReviews.orderId, orders.id))
    .where(and(eq(orders.id, id), eq(orders.customerId, user.id), eq(orders.status, "PAID"))).limit(1);
  if (!row) notFound();
  return <main className="app-main"><div className="shell" style={{maxWidth:720}}><div className="page-head"><div><span className="eyebrow">Pembelian terverifikasi</span><h1 className="display">Ulas {row.product.name}</h1><p>Bagikan pengalaman nyata agar calon pembeli lain dapat mengambil keputusan dengan lebih yakin.</p></div></div>{error && <p className="alert">{error}</p>}<section className="panel"><form className="form" action={submitProductReviewAction.bind(null, row.order.id)}><div className="field"><label>Rating</label><select className="input" name="rating" defaultValue={row.review?.rating ?? 5}><option value="5">★★★★★ — Sangat puas</option><option value="4">★★★★☆ — Puas</option><option value="3">★★★☆☆ — Cukup</option><option value="2">★★☆☆☆ — Kurang</option><option value="1">★☆☆☆☆ — Tidak puas</option></select></div><div className="field"><label>Judul singkat</label><input className="input" name="title" defaultValue={row.review?.title ?? ""} maxLength={100} placeholder="Ringkas pengalaman Anda" /></div><div className="field"><label>Ulasan</label><textarea className="input" name="content" defaultValue={row.review?.content ?? ""} required minLength={10} maxLength={1200} placeholder="Ceritakan hasil, proses, dan hal yang paling membantu." /></div><button className="btn btn-primary" type="submit">Terbitkan ulasan</button></form></section></div></main>;
}
