import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getCurrentUser, getMerchantAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { formatDate } from "@/lib/order";
import { merchantProfiles, orders, products } from "@/lib/schema";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const { id } = await params;
  const [row] = await db.select({ order: orders, product: products, merchant: merchantProfiles }).from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .innerJoin(merchantProfiles, eq(products.merchantId, merchantProfiles.userId))
    .where(and(eq(orders.id, id), eq(orders.status, "PAID"))).limit(1);
  if (!row) notFound();
  const merchantAccess = user.role === "ADMIN" ? null : await getMerchantAccess(user.id);
  const allowed = user.role === "ADMIN" || row.order.customerId === user.id || merchantAccess?.ownerId === row.product.merchantId;
  if (!allowed) notFound();
  return <main className="invoice-page"><div className="invoice-sheet">
    <header><div><span className="brand">Rizqhub</span><h1>BUKTI PEMBAYARAN</h1></div><span className="badge badge-live">LUNAS</span></header>
    <section className="invoice-meta"><div><small>NOMOR PESANAN</small><strong>{row.order.externalId}</strong></div><div><small>TANGGAL PEMBAYARAN</small><strong>{formatDate(row.order.paidAt ?? row.order.updatedAt)}</strong></div></section>
    <section className="invoice-parties"><div><small>DITERBITKAN OLEH</small><strong>{row.merchant.brandName}</strong><span>{row.merchant.supportEmail}</span></div><div><small>PEMBELI</small><strong>{row.order.customerName}</strong><span>{row.order.customerEmail}</span></div></section>
    <table><thead><tr><th>Produk</th><th>Harga</th></tr></thead><tbody><tr><td><strong>{row.product.name}</strong>{row.order.productVariantName && <small>Paket: {row.order.productVariantName}</small>}</td><td>{formatRupiah(row.order.subtotalAmount ?? row.order.amount)}</td></tr>{row.order.discountAmount > 0 && <tr><td>Diskon {row.order.couponCode ? `(${row.order.couponCode})` : ""}</td><td>-{formatRupiah(row.order.discountAmount)}</td></tr>}</tbody><tfoot><tr><th>Total dibayar</th><th>{formatRupiah(row.order.amount)}</th></tr></tfoot></table>
    <p className="invoice-note">Dokumen ini dibuat otomatis dari transaksi yang tercatat di Rizqhub. Simpan sebagai bukti pembayaran.</p>
    <div className="invoice-actions"><Link className="btn" href="/member/orders">Kembali</Link><span className="btn btn-primary">Tekan Ctrl+P untuk cetak</span></div>
  </div></main>;
}
