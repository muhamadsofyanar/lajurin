/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgePercent, CheckCircle2, LockKeyhole, Plus } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { checkoutAction } from "@/app/actions/checkout";
import { Brand } from "@/components/brand";
import { ConversionTracker } from "@/components/conversion-tracker";
import { db } from "@/lib/db";
import { calculateDiscount } from "@/lib/discount";
import { findValidCoupon } from "@/lib/funnel";
import { formatRupiah } from "@/lib/format";
import { featureEnabled } from "@/lib/feature-flags";
import { merchantManualPaymentAccounts, merchantProfiles, productFunnels, productLandingPages, products, users } from "@/lib/schema";

type CheckoutSearch = { error?: string; coupon?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string };

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CheckoutSearch> }) {
  const { slug } = await params;
  const search = await searchParams;
  const [product] = await db.select({ product: products, merchantName: users.name, merchantBrand: merchantProfiles.brandName, landing: productLandingPages }).from(products)
    .innerJoin(users, eq(products.merchantId, users.id))
    .innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .leftJoin(productLandingPages, eq(productLandingPages.productId, products.id))
    .where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"), eq(merchantProfiles.status, "ACTIVE"))).limit(1);
  if (!product) notFound();
  const directManualEnabled = await featureEnabled("DIRECT_MANUAL_PAYMENTS", product.product.merchantId);
  const [manualAccount] = directManualEnabled ? await db.select({ id: merchantManualPaymentAccounts.id }).from(merchantManualPaymentAccounts).where(and(
    eq(merchantManualPaymentAccounts.merchantId, product.product.merchantId),
    eq(merchantManualPaymentAccounts.isActive, true),
  )).limit(1) : [];

  const [funnel] = await db.select().from(productFunnels).where(and(eq(productFunnels.productId, product.product.id), eq(productFunnels.isActive, true))).limit(1);
  const [bumpProduct] = funnel?.orderBumpProductId ? await db.select().from(products).where(and(eq(products.id, funnel.orderBumpProductId), eq(products.merchantId, product.product.merchantId), eq(products.status, "PUBLISHED"))).limit(1) : [];
  const coupon = await findValidCoupon(product.product.id, search.coupon);
  const discount = coupon ? calculateDiscount(product.product.price, coupon.discountType, coupon.discountValue) : 0;
  const discountedPrice = product.product.price - discount;
  const action = checkoutAction.bind(null, product.product.slug);
  const trackingFields = <><input type="hidden" name="utmSource" value={search.utm_source ?? ""} /><input type="hidden" name="utmMedium" value={search.utm_medium ?? ""} /><input type="hidden" name="utmCampaign" value={search.utm_campaign ?? ""} /></>;

  return <><ConversionTracker productId={product.product.id} providerEvent="InitiateCheckout" value={discountedPrice} facebookPixelId={product.landing?.facebookPixelId} tiktokPixelId={product.landing?.tiktokPixelId} /><main className="checkout-wrap"><aside className="checkout-summary"><Brand inverse /><div className="checkout-summary-main">{product.landing?.coverImageUrl && <img className="checkout-summary-cover" src={product.landing.coverImageUrl} alt={`Cover ${product.product.name}`} />}<span className="eyebrow">Checkout aman · {product.merchantBrand ?? product.merchantName}</span><h1 className="display">{product.product.name}</h1><p>{product.product.headline}</p><div className="checkout-price-line">{discount > 0 && <del>{formatRupiah(product.product.price)}</del>}<strong>{formatRupiah(discountedPrice)}</strong></div>{coupon && <span className="coupon-applied"><BadgePercent size={16} /> Kupon {coupon.code} menghemat {formatRupiah(discount)}</span>}<div className="checkout-trust"><span><CheckCircle2 size={15} /> Akses otomatis setelah pembayaran</span><span><CheckCircle2 size={15} /> Transaksi tercatat di akun</span></div></div><small><LockKeyhole size={14} style={{display:"inline",verticalAlign:"middle"}} /> Payment gateway atau transfer manual</small></aside>

    <section className="checkout-main"><div className="checkout-form-card"><Link className="muted" href={`/p/${product.product.slug}`}>← Kembali ke produk</Link><h2 className="display">Data pembeli</h2><p>Produk dijual oleh <strong>{product.merchantBrand ?? product.merchantName}</strong>. Akun yang sama dapat menyimpan kelas dari beberapa merchant.</p>{search.error && <p className="alert">{search.error}</p>}{search.coupon && !coupon && <p className="alert">Kupon tidak valid, sudah berakhir, atau kuotanya habis.</p>}

      <form className="coupon-form" method="get"><div className="field"><label htmlFor="coupon">Punya kupon?</label><div className="input-action"><input className="input" id="coupon" name="coupon" defaultValue={search.coupon ?? ""} placeholder="Masukkan kode" /><button className="btn" type="submit">Terapkan</button></div></div><input type="hidden" name="utm_source" value={search.utm_source ?? ""} /><input type="hidden" name="utm_medium" value={search.utm_medium ?? ""} /><input type="hidden" name="utm_campaign" value={search.utm_campaign ?? ""} /></form>

      <form className="form" action={action}><input type="hidden" name="couponCode" value={coupon?.code ?? ""} />{trackingFields}<div className="field"><label htmlFor="name">Nama lengkap</label><input className="input" id="name" name="name" required minLength={2} autoComplete="name" /></div><div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div><div className="field"><label htmlFor="phone">Nomor WhatsApp</label><input className="input" id="phone" name="phone" type="tel" required minLength={9} maxLength={20} inputMode="tel" autoComplete="tel" placeholder="Contoh: 081234567890" /></div><div className="field"><label htmlFor="password">Password akun member</label><input className="input" id="password" name="password" type="password" minLength={8} required autoComplete="current-password" /><small className="muted">Jika email sudah terdaftar, masukkan password akun tersebut.</small></div>
        {bumpProduct && <label className="order-bump"><input type="checkbox" name="orderBump" /><span className="order-bump-plus"><Plus size={19} /></span><span><small>PENAWARAN TAMBAHAN</small><strong>{funnel?.bumpHeadline || `Tambahkan ${bumpProduct.name}`}</strong><p>{funnel?.bumpDescription || bumpProduct.headline}</p><b>+ {formatRupiah(bumpProduct.price)}</b></span></label>}
        <label className="check-field"><input type="checkbox" name="marketingConsent" /><span>Saya bersedia menerima informasi produk dan pengingat checkout melalui email atau WhatsApp.<small>Opsional. Status persetujuan dicatat pada pesanan dan dipakai untuk membatasi broadcast.</small></span></label>
        <div className="field"><label htmlFor="paymentMethod">Metode pembayaran</label><select className="input" id="paymentMethod" name="paymentMethod" defaultValue="MANUAL_TRANSFER"><option value="MANUAL_TRANSFER">Transfer bank — dikonfirmasi {manualAccount ? "merchant" : "admin Rizqhub"}</option><option value="XENDIT">Payment gateway Xendit</option></select></div><div className="checkout-total"><span>Total produk utama</span><strong>{formatRupiah(discountedPrice)}</strong>{bumpProduct && <small>Jika order bump dipilih, total bertambah {formatRupiah(bumpProduct.price)}.</small>}</div><button className="btn btn-primary btn-large" type="submit">Lanjut ke pembayaran</button></form>
    </div></section></main></>;
}
