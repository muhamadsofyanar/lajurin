import Link from "next/link";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

export async function Nav({ app = false }: { app?: boolean }) {
  const user = await getCurrentUser();
  return <header className={app ? "app-nav" : ""}><nav className="shell nav"><Brand />{!app && <div className="nav-links"><a href="#fitur">Fitur</a><a href="#cara-kerja">Cara kerja</a></div>}<div className="actions">{user ? <><Link className="btn" href={user.role === "MEMBER" ? "/member" : "/dashboard"}>Dashboard</Link><form action={logoutAction}><button className="btn" type="submit">Keluar</button></form></> : <><Link className="btn" href="/login">Masuk</Link><Link className="btn btn-primary" href="/register">Mulai gratis</Link></>}</div></nav></header>;
}
