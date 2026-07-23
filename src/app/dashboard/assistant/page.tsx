import { requireMerchant } from "@/lib/auth";

type Query = { product?: string; audience?: string; result?: string; tone?: string };

export default async function CommerceAssistantPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireMerchant("manage");
  const query = await searchParams;
  const product = query.product?.trim().slice(0, 100);
  const audience = query.audience?.trim().slice(0, 160);
  const result = query.result?.trim().slice(0, 160);
  const tone = query.tone === "professional" ? "Profesional" : query.tone === "friendly" ? "Akrab" : "Tegas";
  const generated = product && audience && result ? {
    headline: `${result} tanpa proses yang membuat ${audience} kewalahan`,
    subheadline: `${product} membantu ${audience} bergerak lebih terarah, dengan proses yang jelas dari awal sampai selesai.`,
    bullets: ["Langkah praktis yang mudah diikuti", "Progres dan akses tersimpan dalam satu akun", `Dukungan untuk membantu mencapai: ${result}`],
    cta: `Mulai dengan ${product}`,
    followup: `Halo Kak, pesanan ${product} Anda masih menunggu. Jika target Anda adalah ${result}, lanjutkan pesanan sekarang agar bisa segera dimulai.`,
  } : null;
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Smart commerce assistant</span><h1 className="display">Asisten copy penjualan</h1><p>Buat draft headline, manfaat, CTA, dan follow-up. Sesuaikan hasil dengan bukti dan karakter brand Anda.</p></div></div>
    <div className="two-col"><section className="panel"><form className="form" method="get"><div className="field"><label>Nama produk</label><input className="input" name="product" defaultValue={product ?? ""} required placeholder="Contoh: Konsultasi Legalitas Usaha" /></div><div className="field"><label>Target pelanggan</label><input className="input" name="audience" defaultValue={audience ?? ""} required placeholder="Contoh: pemilik UMKM yang baru mulai" /></div><div className="field"><label>Hasil utama</label><textarea className="input" name="result" defaultValue={result ?? ""} required placeholder="Contoh: memiliki badan usaha yang tepat dan legal" /></div><div className="field"><label>Gaya bahasa</label><select className="input" name="tone" defaultValue={query.tone ?? "direct"}><option value="direct">Tegas</option><option value="professional">Profesional</option><option value="friendly">Akrab</option></select></div><button className="btn btn-primary" type="submit">Buat draft</button></form></section>
      <section className="panel">{generated ? <div className="stack"><span className="badge">{tone}</span><div><small className="eyebrow">Headline</small><h2>{generated.headline}</h2></div><div><small className="eyebrow">Subheadline</small><p>{generated.subheadline}</p></div><div><small className="eyebrow">Manfaat</small><ul>{generated.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div><div><small className="eyebrow">CTA</small><p><strong>{generated.cta}</strong></p></div><div><small className="eyebrow">Follow-up checkout</small><p>{generated.followup}</p></div></div> : <div className="empty"><p>Isi tiga informasi utama untuk membuat draft copy.</p></div>}</section>
    </div></div></main>;
}
