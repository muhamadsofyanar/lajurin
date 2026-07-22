import { pool } from "../src/lib/db";

type CountRow = { count: number };

async function count(query: string) {
  const result = await pool.query<CountRow>(query);
  return result.rows[0]?.count ?? 0;
}

try {
  const [merchantProfiles, links, workspaces, memberships, missingOwners, brandingMismatch, orphanLinks] = await Promise.all([
    count("select count(*)::int as count from merchant_profiles"),
    count("select count(*)::int as count from legacy_merchant_workspace_links"),
    count("select count(*)::int as count from workspaces w where exists (select 1 from legacy_merchant_workspace_links l where l.workspace_id = w.id)"),
    count("select count(*)::int as count from workspace_memberships wm where wm.role = 'OWNER' and wm.status = 'ACTIVE' and exists (select 1 from legacy_merchant_workspace_links l where l.workspace_id = wm.workspace_id)"),
    count("select count(*)::int as count from legacy_merchant_workspace_links l where not exists (select 1 from workspace_memberships wm where wm.workspace_id = l.workspace_id and wm.role = 'OWNER' and wm.status = 'ACTIVE')"),
    count("select count(*)::int as count from legacy_merchant_workspace_links l join merchant_profiles mp on mp.id = l.merchant_profile_id join workspace_branding wb on wb.workspace_id = l.workspace_id where wb.display_name is distinct from mp.brand_name or wb.logo_url is distinct from mp.logo_url or wb.accent_color is distinct from mp.accent_color or wb.support_email is distinct from mp.support_email or wb.whatsapp is distinct from mp.whatsapp"),
    count("select count(*)::int as count from legacy_merchant_workspace_links l left join merchant_profiles mp on mp.id = l.merchant_profile_id left join users u on u.id = l.legacy_merchant_user_id left join workspaces w on w.id = l.workspace_id where mp.id is null or u.id is null or w.id is null"),
  ]);

  const failures: string[] = [];
  if (links !== merchantProfiles) failures.push("jumlah link tidak sama dengan merchant profile");
  if (workspaces !== merchantProfiles) failures.push("jumlah workspace hasil backfill tidak sama dengan merchant profile");
  if (memberships < merchantProfiles || missingOwners > 0) failures.push("workspace tanpa owner aktif ditemukan");
  if (brandingMismatch > 0) failures.push("branding workspace berbeda dari profil legacy");
  if (orphanLinks > 0) failures.push("link orphan ditemukan");

  console.info(JSON.stringify({
    level: failures.length ? "error" : "info",
    event: "workspace_reconciliation",
    counts: { merchantProfiles, links, workspaces, activeOwnerMemberships: memberships, missingOwners, brandingMismatch, orphanLinks },
    failures,
  }));
  if (failures.length) process.exitCode = 1;
} finally {
  await pool.end();
}
