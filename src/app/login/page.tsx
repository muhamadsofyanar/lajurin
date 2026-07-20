import Link from "next/link";
import { Brand } from "@/components/brand";
import { loginAction } from "@/app/actions/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="auth-wrap"><aside className="auth-aside"><Brand inverse /><div><h1 className="display">Selamat datang kembali.</h1><p>Kelola produk, pesanan, dan member dari satu tempat.</p></div><small>Jual lebih ringkas bersama Lajurin.</small></aside><section className="auth-main"><div className="auth-card"><h2 className="display">Masuk</h2><p>Gunakan akun merchant atau member.</p>{error && <p className="alert">{error}</p>}<form className="form" action={loginAction}><div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div><div className="field"><label htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" minLength={8} required autoComplete="current-password" /></div><button className="btn btn-primary" type="submit">Masuk ke dashboard</button></form><p style={{marginTop:20}}>Belum punya akun? <Link href="/register" style={{fontWeight:800}}>Daftar gratis</Link></p></div></section></main>;
}
