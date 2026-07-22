import Link from "next/link";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

export async function Nav({ app = false }: { app?: boolean }) {
  const user = await getCurrentUser();
  const dashboard = user?.role === "ADMIN" ? "/admin" : user?.role === "MEMBER" ? "/member" : "/dashboard";
  return <header className={app ? "app-nav" : ""}><nav className="shell nav"><Brand />{app && user ? <div className="nav-links app-links"><Link href={dashboard}>Ringkasan</Link>{user.role === "ADMIN" && <Link href="/admin/payments">Konfirmasi pembayaran</Link>}{user.role === "MERCHANT" && <Link href="/dashboard/orders">Transaksi</Link>}<Link href="/member">Kursus</Link><Link href="/member/orders">Pesanan saya</Link><Link href="/community">Komunitas</Link></div> : <div className="nav-links"><a href="#fitur">Fitur</a><a href="#cara-kerja">Cara kerja</a></div>}<div className="actions">{user ? <><Link className="btn nav-dashboard" href={dashboard}>Dashboard</Link><form action={logoutAction}><button className="btn" type="submit">Keluar</button></form></> : <><Link className="btn" href="/login">Masuk</Link><Link className="btn btn-primary" href="/register">Mulai gratis</Link></>}</div></nav></header>;
}
