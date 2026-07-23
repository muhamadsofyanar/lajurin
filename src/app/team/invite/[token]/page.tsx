import Link from "next/link";
import { and, eq, gt } from "drizzle-orm";
import { createHash } from "node:crypto";
import { acceptWorkspaceInvitationAction } from "@/app/actions/workspace";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, workspaceInvitations, workspaces } from "@/lib/schema";

export default async function TeamInvitationPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [row] = await db.select({ invitation: workspaceInvitations, workspaceName: workspaces.name }).from(workspaceInvitations)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId)).where(and(eq(workspaceInvitations.tokenHash, tokenHash), eq(workspaceInvitations.status, "PENDING"), gt(workspaceInvitations.expiresAt, new Date()))).limit(1);
  const current = await getCurrentUser();
  const [existing] = row ? await db.select({ id: users.id }).from(users).where(eq(users.email, row.invitation.email)).limit(1) : [];
  const roleLabel = row?.invitation.role === "OWNER" ? "Owner" : row?.invitation.role === "ADMIN" ? "Admin" : row?.invitation.role === "FINANCE" ? "Finance" : "Staff";
  return <main className="auth-wrap"><aside className="auth-aside"><Brand inverse /><div><h1 className="display">Bergabung dengan tim.</h1><p>Akses workspace menggunakan akun pribadi Anda—tanpa berbagi password Owner.</p></div><small>Undangan aman · akses sesuai peran</small></aside><section className="auth-main"><div className="auth-card"><h2 className="display">Undangan workspace</h2>{error && <p className="alert">{error}</p>}{row ? <><p>Anda diundang sebagai <strong>{roleLabel}</strong> di <strong>{row.workspaceName}</strong> menggunakan email <strong>{row.invitation.email}</strong>.</p>{existing ? current?.email === row.invitation.email ? <form className="form" action={acceptWorkspaceInvitationAction.bind(null, token)}><button className="btn btn-primary" type="submit">Terima undangan</button></form> : <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(`/team/invite/${token}`)}`}>Masuk dengan email undangan</Link> : <form className="form" action={acceptWorkspaceInvitationAction.bind(null, token)}><div className="field"><label htmlFor="name">Nama</label><input className="input" id="name" name="name" required minLength={2} maxLength={80} /></div><div className="field"><label htmlFor="password">Buat password</label><input className="input" id="password" name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /></div><div className="field"><label htmlFor="confirmation">Ulangi password</label><input className="input" id="confirmation" name="confirmation" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /></div><button className="btn btn-primary" type="submit">Buat akun & bergabung</button></form>}</> : <><p className="alert">Undangan tidak valid, telah digunakan, dicabut, atau kedaluwarsa.</p><Link href="/login" className="btn">Ke halaman masuk</Link></>}</div></section></main>;
}
