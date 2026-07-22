import Link from "next/link";
import { CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { eq, inArray } from "drizzle-orm";
import { Brand } from "@/components/brand";
import { ConversionTracker } from "@/components/conversion-tracker";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { orders, productFunnels, productLandingPages, products } from "@/lib/schema";

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  const [row] = orderId ? await db.select({ order: orders, funnel: productFunnels, facebookPixelId: productLandingPages.facebookPixelId, tiktokPixelId: productLandingPages.tiktokPixelId }).from(orders).innerJoin(products, eq(products.id, orders.productId)).leftJoin(productFunnels, eq(productFunnels.productId, orders.productId)).leftJoin(productLandingPages, eq(productLandingPages.productId, orders.productId)).where(eq(orders.id, orderId)).limit(1) : [];
  const paid = row?.order.status === "PAID";
  const offerIds = paid && row?.funnel?.isActive ? [row.funnel.upsellProductId, row.funnel.downsellProductId].filter((id): id is string => Boolean(id)) : [];
  const offerRows = offerIds.length ? await db.select().from(products).where(inArray(products.id, offerIds)) : [];
  const upsell = offerRows.find((item) => item.id === row?.funnel?.upsellProductId);
  const downsell = offerRows.find((item) => item.id === row?.funnel?.downsellProductId);

  return <>{paid && row && <ConversionTracker productId={row.order.productId} providerEvent="Purchase" value={row.order.amount} facebookPixelId={row.facebookPixelId} tiktokPixelId={row.tiktokPixelId} />}<main className="success-page"><section className="success-card"><Brand /><div className={`success-icon ${paid ? "paid" : "pending"}`}>{paid ? <CheckCircle2 size={32} /> : <Clock3 size={32} />}</div><h1 className="display">{paid ? "Pembayaran berhasil" : "Pembayaran sedang dikonfirmasi"}</h1><p>{paid ? "Akses kelas sudah aktif. Anda dapat mulai belajar sekarang." : "Konfirmasi biasanya hanya membutuhkan beberapa detik. Silakan masuk untuk memeriksa akses."}</p><Link className="btn btn-primary btn-large" href="/member">Buka kelas saya</Link>
    {paid && upsell && <section className="post-purchase-offer"><span className="eyebrow"><Sparkles size={14} /> Rekomendasi berikutnya</span><h2>{upsell.name}</h2><p>{upsell.headline}</p><strong>{formatRupiah(upsell.price)}</strong><Link className="btn btn-primary" href={`/p/${upsell.slug}`}>Lihat penawaran</Link>{downsell && <Link className="muted" href={`/p/${downsell.slug}`}>Belum perlu? Lihat alternatif {downsell.name}</Link>}</section>}
  </section></main></>;
}
