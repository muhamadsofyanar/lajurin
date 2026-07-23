import { desc, eq } from "drizzle-orm";
import { moderateProductReviewAction } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { merchantProfiles, productReviews, products, users } from "@/lib/schema";

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  const rows = await db.select({ review: productReviews, productName: products.name, merchantName: merchantProfiles.brandName, customerName: users.name })
    .from(productReviews).innerJoin(products, eq(products.id, productReviews.productId))
    .innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .innerJoin(users, eq(users.id, productReviews.customerId)).orderBy(desc(productReviews.createdAt)).limit(200);
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Trust & safety</span><h1 className="display">Moderasi ulasan</h1><p>Sembunyikan konten yang melanggar tanpa mengubah isi ulasan pembeli.</p></div></div>{error && <p className="alert">{error}</p>}<section className="panel">{rows.length ? rows.map(({ review, productName, merchantName, customerName }) => <div className="review-manage-row" key={review.id}><div><span className="stars">{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</span><h3>{review.title || productName}</h3><p>{review.content}</p><small>{customerName} · {merchantName} · {formatDate(review.createdAt)}</small></div><div className="actions"><span className={`badge ${review.status === "PUBLISHED" ? "badge-live" : ""}`}>{review.status === "PUBLISHED" ? "Terbit" : "Disembunyikan"}</span><form action={moderateProductReviewAction.bind(null, review.id, review.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED")}><button className={`btn btn-compact ${review.status === "PUBLISHED" ? "btn-danger" : ""}`} type="submit">{review.status === "PUBLISHED" ? "Sembunyikan" : "Terbitkan"}</button></form></div></div>) : <div className="empty"><p>Belum ada ulasan.</p></div>}</section></div></main>;
}
