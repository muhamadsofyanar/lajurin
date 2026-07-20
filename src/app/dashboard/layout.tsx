import { Nav } from "@/components/nav";
import { requireMerchant } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireMerchant();
  return <div className="app"><Nav app />{children}</div>;
}
