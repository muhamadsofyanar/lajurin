import Link from "next/link";
import { and, eq, gt, isNull } from "drizzle-orm";
import { createHash } from "node:crypto";
import { resetPasswordAction } from "@/app/actions/auth";
import { Brand } from "@/components/brand";
import { db } from "@/lib/db";
import { passwordResetTokens } from "@/lib/schema";

export default async function ResetPasswordPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [valid] = await db.select({ id: passwordResetTokens.id }).from(passwordResetTokens).where(and(
    eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()),
  )).limit(1);
  return <main className="auth-wrap"><aside className="auth-aside"><Brand inverse /><div><h1 className="display">Buat password baru.</h1><p>Gunakan password unik yang tidak dipakai pada layanan lain.</p></div><small>Minimal 8 karakter.</small></aside><section className="auth-main"><div className="auth-card"><h2 className="display">Atur ulang password</h2>{error && <p className="alert">{error}</p>}{valid ? <form className="form" action={resetPasswordAction.bind(null, token)}><div className="field"><label htmlFor="password">Password baru</label><input className="input" id="password" name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" /></div><div className="field"><label htmlFor="confirmation">Ulangi password baru</label><input className="input" id="confirmation" name="confirmation" type="password" minLength={8} maxLength={128} required autoComplete="new-password" /></div><button className="btn btn-primary" type="submit">Simpan password baru</button></form> : <><p className="alert">Tautan reset tidak valid atau sudah kedaluwarsa.</p><Link className="btn btn-primary" href="/forgot-password">Minta tautan baru</Link></>}</div></section></main>;
}
