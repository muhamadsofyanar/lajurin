import Link from "next/link";
import { Brand } from "@/components/brand";

export default function OfflinePage() {
  return <main className="auth-page"><section className="auth-card"><Brand /><span className="eyebrow">Sedang offline</span><h1 className="display">Koneksi internet terputus.</h1><p>Periksa koneksi, lalu coba buka kembali halaman Rizqhub.</p><Link className="btn btn-primary" href="/">Coba lagi</Link></section></main>;
}
