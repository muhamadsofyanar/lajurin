import Link from "next/link";
import { and, count, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { Send } from "lucide-react";
import {
  deleteBroadcastTemplateAction,
  queueBroadcastAction,
  saveBroadcastTemplateAction,
} from "@/app/actions/broadcast";
import { requireMerchant } from "@/lib/auth";
import { broadcastDailyRecipientLimit } from "@/lib/broadcasts";
import { db } from "@/lib/db";
import { requireFeature } from "@/lib/feature-flags";
import { broadcastCampaigns, broadcastTemplates, orders, products } from "@/lib/schema";

export default async function BroadcastsPage({ searchParams }: {
  searchParams: Promise<{ error?: string; success?: string; template?: string }>;
}) {
  const merchant = await requireMerchant("broadcast");
  await requireFeature("CUSTOMER_BROADCASTS", merchant.id);
  const { error, success, template: selectedTemplateId } = await searchParams;
  const [campaigns, templates, merchantProducts, [{ abandoned }], [{ customers }], [{ usedToday }]] = await Promise.all([
    db.select().from(broadcastCampaigns).where(eq(broadcastCampaigns.merchantId, merchant.id)).orderBy(desc(broadcastCampaigns.createdAt)).limit(30),
    db.select().from(broadcastTemplates).where(eq(broadcastTemplates.merchantId, merchant.id)).orderBy(desc(broadcastTemplates.updatedAt)).limit(30),
    db.select({ id: products.id, name: products.name }).from(products).where(eq(products.merchantId, merchant.id)).orderBy(products.name),
    db.select({ abandoned: count() }).from(orders).innerJoin(products, eq(products.id, orders.productId)).where(and(
      eq(products.merchantId, merchant.id),
      eq(orders.marketingConsent, true),
      inArray(orders.status, ["PENDING", "FAILED", "EXPIRED"]),
      lt(orders.createdAt, sql`now() - interval '30 minutes'`),
      gt(orders.createdAt, sql`now() - interval '7 days'`),
    )),
    db.select({ customers: sql<number>`count(distinct lower(${orders.customerEmail}))::int` }).from(orders).innerJoin(products, eq(products.id, orders.productId)).where(and(
      eq(products.merchantId, merchant.id),
      eq(orders.marketingConsent, true),
      eq(orders.status, "PAID"),
    )),
    db.select({ usedToday: sql<number>`coalesce(sum(${broadcastCampaigns.recipientCount}), 0)::int` }).from(broadcastCampaigns).where(and(
      eq(broadcastCampaigns.merchantId, merchant.id),
      sql`${broadcastCampaigns.createdAt} >= date_trunc('day', now())`,
    )),
  ]);
  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId);
  const dailyLimit = broadcastDailyRecipientLimit();

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><span className="eyebrow">Customer engagement</span><h1 className="display" style={{ marginTop: 12 }}>Broadcast & abandoned checkout</h1><p>Kampanye hanya mengantrekan penerima yang memberi persetujuan pemasaran. Pengiriman berjalan per batch dan dapat diulang jika gagal.</p></div></div>
    {error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}
    <div className="stats stats-4"><article className="stat"><span>Pelanggan berizin</span><strong>{customers}</strong></article><article className="stat"><span>Abandoned berizin</span><strong>{abandoned}</strong></article><article className="stat"><span>Kuota hari ini</span><strong>{Math.max(0, dailyLimit - usedToday)}</strong><small>dari {dailyLimit} penerima</small></article><article className="stat"><span>Batas kampanye</span><strong>100</strong><small>penerima unik</small></article></div>

    <div className="two-col"><section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Buat antrean broadcast</h2><Send size={19} /></div>
      {templates.length > 0 && <div className="template-picker"><strong>Gunakan template</strong><div className="actions">{templates.map((template) => <Link className="btn" href={`/dashboard/broadcasts?template=${template.id}`} key={template.id}>{template.name}</Link>)}</div></div>}
      <form className="form" action={queueBroadcastAction}>
        <div className="field"><label htmlFor="campaignName">Nama kampanye</label><input className="input" id="campaignName" name="name" required minLength={3} maxLength={100} /></div>
        <div className="two-field"><div className="field"><label htmlFor="audience">Segmentasi</label><select className="input" id="audience" name="audience"><option value="ALL_CUSTOMERS">Pelanggan berbayar</option><option value="ABANDONED_CHECKOUT">Checkout terbengkalai 30 menit sampai 7 hari</option></select></div><div className="field"><label htmlFor="productId">Produk</label><select className="input" id="productId" name="productId"><option value="">Semua produk</option>{merchantProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></div></div>
        <div className="two-field"><label className="check-field"><input type="checkbox" name="sendEmail" defaultChecked /><span>Email<small>Mailketing</small></span></label><label className="check-field"><input type="checkbox" name="sendWhatsapp" /><span>WhatsApp<small>StarSender</small></span></label></div>
        <div className="field"><label htmlFor="subject">Subjek email</label><input className="input" id="subject" name="subject" maxLength={160} defaultValue={selectedTemplate?.subject ?? ""} /></div>
        <div className="field"><label htmlFor="message">Pesan</label><textarea className="input" id="message" name="message" required minLength={10} maxLength={3000} defaultValue={selectedTemplate?.message ?? "Halo {nama}, lanjutkan langkah Anda untuk {produk}: {tautan}"} /><small className="field-hint">Variabel aman: {"{nama}"}, {"{produk}"}, dan {"{tautan}"}.</small></div>
        <label className="check-field"><input type="checkbox" name="consentConfirmed" required /><span>Saya memahami bahwa sistem hanya memilih penerima dengan consent pemasaran yang tercatat.<small>Consent tidak dapat diganti oleh pilihan operator.</small></span></label>
        <button className="btn btn-primary" type="submit">Buat antrean</button>
      </form>
    </section>

    <section className="panel"><div className="panel-head"><h2>Template pesan</h2><span className="badge">{templates.length}</span></div>
      <form className="form" action={saveBroadcastTemplateAction}><div className="field"><label htmlFor="templateName">Nama template</label><input className="input" id="templateName" name="templateName" required minLength={3} maxLength={80} /></div><div className="field"><label htmlFor="templateSubject">Subjek</label><input className="input" id="templateSubject" name="subject" maxLength={160} /></div><div className="field"><label htmlFor="templateMessage">Pesan</label><textarea className="input" id="templateMessage" name="message" required minLength={10} maxLength={3000} placeholder="Halo {nama}, informasi untuk {produk}: {tautan}" /></div><button className="btn" type="submit">Simpan template</button></form>
      {templates.map((template) => <div className="finance-row" key={template.id}><div><strong>{template.name}</strong><small>{template.subject || "Tanpa subjek"}</small></div><div className="actions"><Link className="btn" href={`/dashboard/broadcasts?template=${template.id}`}>Pakai</Link><form action={deleteBroadcastTemplateAction.bind(null, template.id)}><button className="btn btn-danger" type="submit">Hapus</button></form></div></div>)}
    </section></div>

    <section className="panel"><div className="panel-head"><h2>Riwayat kampanye</h2><span className="badge">{campaigns.length}</span></div>{campaigns.length ? campaigns.map((campaign) => <Link className="finance-row" href={`/dashboard/broadcasts/${campaign.id}`} key={campaign.id}><div><strong>{campaign.name}</strong><small>{campaign.audience === "ALL_CUSTOMERS" ? "Pelanggan" : "Abandoned checkout"} · {campaign.status}</small></div><div className="broadcast-counts"><strong>{campaign.sentCount} terkirim</strong><small>{campaign.failedCount} gagal · {campaign.recipientCount} penerima</small></div></Link>) : <div className="empty"><p>Belum ada broadcast.</p></div>}</section>
  </div></main>;
}
