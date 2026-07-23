import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HandHeart, Scale, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Nav } from "@/components/nav";

export const metadata: Metadata = { title: "Tentang RizqHub", description: "Visi, misi, dan nilai yang mengarahkan ekosistem RizqHub." };
const values = [
  [Sparkles, "Tauhid", "Meyakini Allah sebagai Ar-Razzāq dan menempatkan platform hanya sebagai wasilah."],
  [HandHeart, "Manfaat", "Mengutamakan produk, layanan, dan hubungan yang menghadirkan nilai nyata."],
  [ShieldCheck, "Amanah", "Menjaga transaksi, data, kepercayaan, dan tanggung jawab secara profesional."],
  [Scale, "Halal & adil", "Bertumbuh melalui cara yang baik, transparan, tidak merugikan, dan dapat dipertanggungjawabkan."],
  [Users, "Kolaborasi", "Saling mengangkat, membuka kesempatan, dan memberdayakan potensi manusia."],
] as const;
export default function AboutPage() {
  return <><Nav/><main><section className="philosophy-hero"><div className="shell narrow"><span className="eyebrow">Tentang RizqHub</span><h1 className="display">Teknologi yang menghubungkan potensi dengan kesempatan.</h1><p>Platform commerce dan pemberdayaan untuk ilmu, karya, jasa, serta kolaborasi yang bermanfaat.</p></div></section><section className="section"><div className="shell"><div className="about-grid"><article><span className="eyebrow">Visi</span><h2>Menjadi ekosistem tepercaya yang membantu lebih banyak orang menemukan, mengembangkan, dan menghadirkan rezeki yang halal, bernilai, serta penuh keberkahan.</h2></article><article><span className="eyebrow">Misi</span><ol><li>Memudahkan manusia mengubah potensi dan keahlian menjadi manfaat.</li><li>Membuka akses terhadap ilmu, peluang, pelanggan, dan jaringan.</li><li>Membangun transaksi digital yang aman, transparan, dan bertanggung jawab.</li><li>Memberdayakan pendidik, profesional, kreator, dan pelaku usaha.</li><li>Mengukur keberhasilan melalui pertumbuhan sekaligus dampak.</li></ol></article></div><div className="about-values">{values.map(([Icon,title,copy])=><article key={title}><Icon/><h3>{title}</h3><p>{copy}</p></article>)}</div><div className="about-links"><Link className="btn btn-primary" href="/manifesto">Baca manifesto <ArrowRight size={16}/></Link><Link className="btn" href="/filosofi">Baca filosofi</Link><Link className="btn" href="/trust">Pusat kepercayaan</Link></div></div></section></main></>;
}
