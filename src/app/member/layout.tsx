import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="app"><Nav app />{children}</div>;
}
