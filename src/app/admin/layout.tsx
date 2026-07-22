import { Nav } from "@/components/nav";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="app"><Nav app />{children}</div>;
}
