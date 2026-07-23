import { and, desc, eq, isNull } from "drizzle-orm";
import { activateSubscriptionAction, cancelSubscriptionAction } from "@/app/actions/subscription";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { orders, products, productSubscriptions } from "@/lib/schema";

export default async function SubscriptionsDashboard({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const merchant = await requireMerchant();
  const query = await searchParams;
  const [subscriptions, eligible] = await Promise.all([
    db.select({ subscription: productSubscriptions, productName: products.name, order: orders }).from(productSubscriptions)
      .innerJoin(products, eq(products.id, productSubscriptions.productId)).innerJoin(orders, eq(orders.id, productSubscriptions.orderId))
      .where(eq(products.merchantId, merchant.id)).orderBy(desc(productSubscriptions.createdAt)),
    db.select({ order: orders, productName: products.name, subscriptionId: productSubscriptions.id }).from(orders)
      .innerJoin(products, eq(products.id, orders.productId)).leftJoin(productSubscriptions, eq(productSubscriptions.orderId, orders.id))
      .where(and(eq(products.merchantId, merchant.id), eq(orders.status, "PAID"), isNull(productSubscriptions.id))).orderBy(desc(orders.paidAt)).limit(50),
  ]);
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Pendapatan berulang</span><h1 className="display">Subscription</h1><p>Kelola keanggotaan berkala. Penagihan otomatis dapat dihubungkan setelah payment gateway recurring aktif.</p></div></div>
    {query.success && <p className="alert alert-success">{query.success}</p>}{query.error && <p className="alert">{query.error}</p>}
    <section className="panel"><div className="panel-head"><h2>Aktifkan dari pembeli lunas</h2></div>{eligible.length ? eligible.map(({ order, productName }) => <form className="finance-row" action={activateSubscriptionAction.bind(null, order.id)} key={order.id}><div><strong>{order.customerName} · {productName}</strong><small>{order.customerEmail} · {order.externalId}</small></div><div className="actions"><select className="input compact-input" name="intervalMonths" defaultValue="1"><option value="1">Bulanan</option><option value="3">3 bulanan</option><option value="6">6 bulanan</option><option value="12">Tahunan</option></select><button className="btn btn-primary" type="submit">Aktifkan</button></div></form>) : <div className="empty"><p>Tidak ada pembeli lunas yang belum menjadi langganan.</p></div>}</section>
    <section className="panel"><div className="panel-head"><h2>Daftar langganan</h2></div>{subscriptions.length ? subscriptions.map(({ subscription, productName, order }) => <div className="finance-row" key={subscription.id}><div><strong>{order.customerName} · {productName}</strong><small>{subscription.renewsAt ? `Pembaruan berikutnya ${formatDate(subscription.renewsAt)}` : "Tanpa tanggal pembaruan"} · setiap {subscription.intervalMonths} bulan</small></div><div className="actions"><span className={`badge status-${subscription.status === "ACTIVE" ? "paid" : "failed"}`}>{subscription.status === "ACTIVE" ? "Aktif" : "Berakhir"}</span>{subscription.status === "ACTIVE" && <form action={cancelSubscriptionAction.bind(null, subscription.id)}><button className="btn btn-danger btn-compact" type="submit">Akhiri</button></form>}</div></div>) : <div className="empty"><p>Belum ada langganan.</p></div>}</section>
  </div></main>;
}
