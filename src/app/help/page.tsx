import Link from "next/link";
import { Nav } from "@/components/nav";
const guides = [
  ["Mulai sebagai merchant", "Lengkapi profil toko, aktifkan rekening pembayaran, buat produk pertama, lalu terbitkan landing page.", "/dashboard/getting-started"],
  ["Membuat produk", "Pilih kursus, produk digital, atau jasa. Isi hasil utama, deskripsi, harga, dan delivery.", "/dashboard/products/new"],
  ["Menerima pembayaran", "Aktifkan transfer langsung atau payment gateway, lalu pantau status pesanan dari dashboard.", "/dashboard/payments"],
  ["Mengelola pelanggan", "Gunakan CRM untuk label, catatan internal, progres, dan komunikasi pelanggan.", "/dashboard/customers"],
];
export default function HelpPage() {
  return <><Nav /><main className="app-main"><div className="shell" style={{ maxWidth: 900 }}><div className="page-head"><div><span className="eyebrow">Pusat bantuan</span><h1 className="display" style={{ marginTop: 12 }}>Mulai menggunakan Rizqhub</h1><p>Panduan singkat untuk menyelesaikan pekerjaan utama.</p></div></div><section className="panel">{guides.map(([title, copy, href]) => <div className="table-row" key={title}><div><strong>{title}</strong><small>{copy}</small></div><Link className="btn btn-compact" href={href}>Buka</Link></div>)}</section></div></main></>;
}
