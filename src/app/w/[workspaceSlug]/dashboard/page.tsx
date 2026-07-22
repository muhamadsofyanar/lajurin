import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { WorkspaceAccessError } from "@/modules/workspace";
import { resolveCurrentWorkspace } from "@/platform/auth/workspace-context";
import { isWorkspaceCanaryUser } from "@/platform/feature-flags/workspace";

export default async function WorkspaceDashboardCanaryPage({ params }: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  let resolved: Awaited<ReturnType<typeof resolveCurrentWorkspace>>;
  try {
    resolved = await resolveCurrentWorkspace(workspaceSlug);
  } catch (error) {
    if (error instanceof WorkspaceAccessError) notFound();
    throw error;
  }
  if (!isWorkspaceCanaryUser(resolved.actor.userId) || !resolved.workspace) notFound();

  return <div className="app"><Nav app /><main className="app-main"><div className="shell">
    <section className="page-head"><div><span className="eyebrow">Workspace Foundation · Canary</span><h1 className="display">{resolved.workspace.workspaceSlug}</h1><p>Membership dan workspace aktif telah diverifikasi server-side.</p></div></section>
    <section className="panel form-panel">
      <h2>Compatibility mode aktif</h2>
      <p>Operasi produk, transaksi, LMS, komunitas, dan keuangan masih memakai jalur merchant lama sampai cutover M2 disetujui.</p>
      <div className="actions"><Link className="btn btn-primary" href="/dashboard">Buka dashboard usaha</Link></div>
    </section>
  </div></main></div>;
}
