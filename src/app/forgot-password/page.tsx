import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { Brand } from "@/components/brand";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const { error, success } = await searchParams;
  return <main className="auth-wrap"><aside className="auth-aside"><Brand inverse /><div><h1 className="display">Pulihkan akses akun.</h1><p>Kami akan mengirim tautan aman ke email akun Lajurin Anda.</p></div><small>Tautan berlaku selama 60 menit.</small></aside><section className="auth-main"><div className="auth-card"><h2 className="display">Lupa password</h2><p>Masukkan email akun merchant, tim, atau member.</p>{error && <p className="alert">{error}</p>}{success && <p className="alert alert-success">{success}</p>}<form className="form" action={requestPasswordResetAction}><div className="field"><label htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" required autoComplete="email" /></div><button className="btn btn-primary" type="submit">Kirim tautan reset</button></form><p style={{ marginTop: 20 }}><Link href="/login" style={{ fontWeight: 800 }}>Kembali ke halaman masuk</Link></p></div></section></main>;
}
