import Link from "next/link";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { unreadNotificationCount } from "@/lib/in-app-notifications";
import { WorkspaceSwitcher } from "@/modules/workspace/presentation/workspace-switcher";

type NavItem = { href: string; label: string };

const commonLinks: NavItem[] = [
  { href: "/member", label: "Kelas saya" },
  { href: "/member/orders", label: "Pesanan saya" },
  { href: "/community", label: "Komunitas" },
  { href: "/inbox", label: "Inbox" },
];

const roleLinks = {
  ADMIN: {
    primary: [
      { href: "/admin", label: "Ringkasan" },
      { href: "/admin/merchants", label: "Merchant" },
      { href: "/admin/transactions", label: "Transaksi" },
      { href: "/admin/operations", label: "Operasional" },
    ],
    secondary: [
      { href: "/admin/payments", label: "Konfirmasi pembayaran" },
      { href: "/admin/payouts", label: "Payout merchant" },
      { href: "/admin/products", label: "Produk platform" },
      { href: "/admin/members", label: "Member platform" },
      { href: "/admin/integrations", label: "Integrasi" },
      { href: "/admin/audit", label: "Audit log" },
      { href: "/admin/settings", label: "Pengaturan" },
    ],
    sectionLabel: "Kelola platform",
  },
  MERCHANT: {
    primary: [
      { href: "/dashboard", label: "Ringkasan" },
      { href: "/dashboard/analytics", label: "Analitik" },
      { href: "/dashboard/orders", label: "Transaksi" },
      { href: "/dashboard/customers", label: "Pelanggan" },
    ],
    secondary: [
      { href: "/dashboard/automation", label: "Automation" },
      { href: "/dashboard/finance", label: "Saldo & payout" },
      { href: "/dashboard/profile", label: "Profil toko" },
    ],
    sectionLabel: "Kelola usaha",
  },
  MEMBER: {
    primary: commonLinks,
    secondary: [],
    sectionLabel: "Area member",
  },
} as const;

function MenuLinks({ items }: { items: readonly NavItem[] }) {
  return items.map((item) => <Link className="nav-menu-link" href={item.href} key={item.href}>{item.label}</Link>);
}

export async function Nav({ app = false }: { app?: boolean }) {
  const user = await getCurrentUser();
  const dashboard = user?.role === "ADMIN" ? "/admin" : user?.role === "MEMBER" ? "/member" : "/dashboard";
  const dashboardLabel = user?.role === "ADMIN" ? "Admin" : user?.role === "MERCHANT" ? "Dashboard usaha" : "Kelas saya";
  const unread = user ? await unreadNotificationCount(user.id) : 0;

  if (!app || !user) {
    return <header><nav aria-label="Navigasi utama" className="shell nav"><Brand /><div className="nav-links"><a href="#fitur">Fitur</a><a href="#cara-kerja">Cara kerja</a></div><div className="actions">{user ? <><Link className="btn" href={dashboard}>{dashboardLabel}</Link><form action={logoutAction}><button className="btn" type="submit">Keluar</button></form></> : <><Link className="btn" href="/login">Masuk</Link><Link className="btn btn-primary" href="/register">Mulai gratis</Link></>}</div></nav></header>;
  }

  const navigation = roleLinks[user.role];
  const initial = user.name.trim().slice(0, 1).toUpperCase();
  const roleLabel = user.role === "ADMIN" ? "Administrator" : user.role === "MERCHANT" ? "Merchant" : "Member";
  const additionalLinks = user.role === "MEMBER" ? [] : commonLinks;

  return <header className="app-nav">
    <nav aria-label="Navigasi aplikasi" className="shell nav app-nav-shell">
      <Brand />

      <div className="app-nav-desktop">
        <div className="app-primary-links">{navigation.primary.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</div>
        {(navigation.secondary.length > 0 || additionalLinks.length > 0) && <details className="nav-popover nav-more">
          <summary>Lainnya <ChevronDown size={15} /></summary>
          <div className="nav-popover-panel nav-more-panel">
            {navigation.secondary.length > 0 && <section><span className="nav-section-label">{navigation.sectionLabel}</span><MenuLinks items={navigation.secondary} /></section>}
            {additionalLinks.length > 0 && <section><span className="nav-section-label">Belajar & komunikasi</span><MenuLinks items={additionalLinks} /></section>}
          </div>
        </details>}
      </div>

      <div className="app-nav-actions">
        <Link aria-label={`Notifikasi${unread > 0 ? `, ${unread} belum dibaca` : ""}`} className="nav-icon-button" href="/notifications" title="Notifikasi">
          <Bell size={19} />{unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}
        </Link>
        <details className="nav-popover nav-account">
          <summary><span className="nav-avatar">{initial}</span><span className="nav-account-copy"><strong>{user.name}</strong><small>{roleLabel}</small></span><ChevronDown size={15} /></summary>
          <div className="nav-popover-panel nav-account-panel">
            <div className="nav-account-card"><span className="nav-avatar large">{initial}</span><span><strong>{user.name}</strong><small>{roleLabel}</small></span></div>
            <WorkspaceSwitcher userId={user.id} />
            <Link className="nav-menu-link" href={dashboard}>Buka {dashboardLabel}</Link>
            <form action={logoutAction}><button className="nav-logout" type="submit">Keluar dari akun</button></form>
          </div>
        </details>
      </div>

      <details className="mobile-nav">
        <summary><Menu size={19} /><span>Menu</span>{unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}</summary>
        <div className="mobile-nav-panel">
          <div className="mobile-account"><span className="nav-avatar large">{initial}</span><span><strong>{user.name}</strong><small>{roleLabel}</small></span></div>
          <section><span className="nav-section-label">Menu utama</span><div className="mobile-nav-grid"><MenuLinks items={navigation.primary} /></div></section>
          {navigation.secondary.length > 0 && <section><span className="nav-section-label">{navigation.sectionLabel}</span><div className="mobile-nav-grid"><MenuLinks items={navigation.secondary} /></div></section>}
          {additionalLinks.length > 0 && <section><span className="nav-section-label">Belajar & komunikasi</span><div className="mobile-nav-grid"><MenuLinks items={additionalLinks} /></div></section>}
          <WorkspaceSwitcher userId={user.id} />
          <Link className="mobile-notification-link" href="/notifications"><span>Notifikasi</span>{unread > 0 && <b>{unread > 99 ? "99+" : unread}</b>}</Link>
          <form action={logoutAction}><button className="nav-logout mobile-logout" type="submit">Keluar dari akun</button></form>
        </div>
      </details>
    </nav>
  </header>;
}
