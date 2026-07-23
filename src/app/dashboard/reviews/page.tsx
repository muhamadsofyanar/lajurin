import { desc, eq } from "drizzle-orm";
import { replyProductReviewAction } from "@/app/actions/review";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { productReviews, products, users } from "@/lib/schema";

export default async function MerchantReviewsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const merchant = await requireMerchant();
  const { error } = await searchParams;
  const rows = await db.select({ review: productReviews, productName: products.name, customerName: users.name })
    .from(productReviews).innerJoin(products, eq(products.id, productReviews.productId))
    .innerJoin(users, eq(users.id, productReviews.customerId)).where(eq(products.merchantId, merchant.id))
    .orderBy(desc(productReviews.createdAt));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Reputasi</span><h1 className="display">Ulasan pembeli</h1><p>Semua ulasan berasal dari order lunas. Tanggapi secara profesional tanpa mengubah pengalaman pelanggan.</p></div></div>{error && <p className="alert">{error}</p>}<section className="panel">{rows.length ? rows.map(({ review, productName, customerName }) => <article className="review-manage-row" key={review.id}><div><span className="stars">{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span><h3>{review.title || productName}</h3><p>{review.content}</p><small>{customerName} · Pembelian terverifikasi · {formatDate(review.createdAt)}</small>{review.merchantReply && <blockquote><strong>Balasan merchant</strong><p>{review.merchantReply}</p></blockquote>}</div><form className="form" action={replyProductReviewAction.bind(null, review.id)}><textarea className="input" name="reply" defaultValue={review.merchantReply ?? ""} required minLength={3} maxLength={800} placeholder="Tulis balasan merchant" /><button className="btn" type="submit">Simpan balasan</button></form></article>) : <div className="empty"><p>Belum ada ulasan pembeli.</p></div>}</section></div></main>;
}
