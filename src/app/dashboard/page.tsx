import Link from "next/link";
import { Plus } from "lucide-react";
import { and, count, desc, eq } from "drizzle-orm";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { orders, products } from "@/lib/schema";

export default async function DashboardPage() {
  const merchant = await requireMerchant();
  const productRows = await db.select().from(products).where(eq(products.merchantId, merchant.id)).orderBy(desc(products.createdAt));
  const productData = await Promise.all(productRows.map(async (product) => {
    const [{ value: orderCount }] = await db.select({ value: count() }).from(orders).where(eq(orders.productId, product.id));
    return { ...product, orderCount };
  }));
  const paidOrders = await db.select({ amount: orders.amount }).from(orders).innerJoin(products, eq(orders.productId, products.id)).where(and(eq(products.merchantId, merchant.id), eq(orders.status, "PAID")));
  const revenue = paidOrders.reduce((total, order) => total + order.amount, 0);

  return <main className="app-main"><div className="shell"><div className="page-head"><div><h1 className="display">Halo, {merchant.name.split(" ")[0]}.</h1><p>Pantau bisnis digitalmu dari sini.</p></div><Link className="btn btn-primary" href="/dashboard/products/new"><Plus size={17} /> Produk baru</Link></div><section className="stats"><div className="stat"><span>Total pendapatan</span><strong>{formatRupiah(revenue)}</strong></div><div className="stat"><span>Pesanan lunas</span><strong>{paidOrders.length}</strong></div><div className="stat"><span>Total produk</span><strong>{productData.length}</strong></div></section><section className="panel"><div className="panel-head"><h2>Produk</h2><span className="muted" style={{fontSize:12}}>{productData.length} produk</span></div>{productData.length ? productData.map((product) => <Link className="product-row" href={`/dashboard/products/${product.id}`} key={product.id}><div><h3>{product.name}</h3><p>/p/{product.slug} · {product.orderCount} pesanan</p></div><strong className="price-cell">{formatRupiah(product.price)}</strong><span className={`badge ${product.status === "PUBLISHED" ? "badge-live" : ""}`}>{product.status === "PUBLISHED" ? "Aktif" : "Draf"}</span></Link>) : <div className="empty"><p>Belum ada produk.</p><Link className="btn btn-primary" href="/dashboard/products/new">Buat produk pertama</Link></div>}</section></div></main>;
}
