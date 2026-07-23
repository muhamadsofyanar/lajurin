import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { reportProductAction } from "@/app/actions/report";
import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { merchantProfiles, products } from "@/lib/schema";

export default async function ReportProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  await requireUser();
  const { slug } = await params;
  const query = await searchParams;
  const [row] = await db.select({ product: products, merchantName: merchantProfiles.brandName }).from(products)
    .innerJoin(merchantProfiles, eq(merchantProfiles.userId, products.merchantId))
    .where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED"))).limit(1);
  if (!row) notFound();
  return <><Nav app/><main className="app-main"><div className="shell" style={{maxWidth:720}}><div className="page-head"><div><span className="eyebrow">Trust & safety</span><h1 className="display">Laporkan produk</h1><p>{row.product.name} · {row.merchantName}</p></div></div>{query.success&&<p className="alert alert-success">{query.success}</p>}{query.error&&<p className="alert">{query.error}</p>}<section className="panel"><form className="form" action={reportProductAction.bind(null,row.product.id)}><div className="field"><label>Alasan</label><select className="input" name="reason" required><option value="MISLEADING">Informasi atau klaim menyesatkan</option><option value="ILLEGAL">Diduga ilegal atau terlarang</option><option value="COPYRIGHT">Pelanggaran hak cipta atau merek</option><option value="PRIVACY">Pelanggaran privasi</option><option value="FRAUD">Dugaan penipuan</option><option value="OTHER">Lainnya</option></select></div><div className="field"><label>Jelaskan masalahnya</label><textarea className="input" name="details" required minLength={20} maxLength={2000} placeholder="Tuliskan fakta yang dapat membantu peninjauan. Jangan memasukkan data sensitif yang tidak diperlukan." /></div><button className="btn btn-danger" type="submit">Kirim laporan</button></form></section></div></main></>;
}
