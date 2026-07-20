import Link from "next/link";
import { Brand } from "@/components/brand";
import { registerAction } from "@/app/actions/auth";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="auth-wrap"><aside className="auth-aside"><Brand inverse /><div><h1 className="display">Mulai menjual tanpa ribet.</h1><p>Buat akun merchant dan terbitkan produk digital pertamamu.</p></div><small>Halaman jualan · Pembayaran · Kursus</small></aside><section className="auth-main"><div className="auth-card"><h2 className="display">Buat akun</h2><p>Gratis untuk menyiapkan produk pertama.</p>{error && <p className="alert">{error}</p>}<form className="form" action={registerAction}><div className="field"><label htmlFor="name">Nama</label><input className="input" id="name" name="name" required minLength={2} autoComplete="name" /></div><div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div><div className="field"><label htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" minLength={8} required autoComplete="new-password" /><small className="muted">Minimal 8 karakter.</small></div><button className="btn btn-primary" type="submit">Buat akun merchant</button></form><p style={{marginTop:20}}>Sudah punya akun? <Link href="/login" style={{fontWeight:800}}>Masuk</Link></p></div></section></main>;
}
