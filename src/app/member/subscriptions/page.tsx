import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { products, productSubscriptions } from "@/lib/schema";

export default async function MemberSubscriptionsPage() {
  const user = await requireUser();
  const rows = await db.select({ subscription: productSubscriptions, productName: products.name }).from(productSubscriptions)
    .innerJoin(products, eq(products.id, productSubscriptions.productId))
    .where(eq(productSubscriptions.customerId, user.id)).orderBy(desc(productSubscriptions.createdAt));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Keanggotaan</span><h1 className="display">Langganan saya</h1><p>Lihat status dan jadwal pembaruan keanggotaan Anda.</p></div></div><section className="panel">{rows.length ? rows.map(({ subscription, productName }) => <div className="finance-row" key={subscription.id}><div><strong>{productName}</strong><small>Setiap {subscription.intervalMonths} bulan{subscription.renewsAt ? ` · berikutnya ${formatDate(subscription.renewsAt)}` : ""}</small></div><span className={`badge status-${subscription.status === "ACTIVE" ? "paid" : "failed"}`}>{subscription.status === "ACTIVE" ? "Aktif" : "Berakhir"}</span></div>) : <div className="empty"><p>Belum ada langganan.</p></div>}</section></div></main>;
}
