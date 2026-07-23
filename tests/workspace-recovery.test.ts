import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("migration 0014 memprovisi workspace merchant lama secara idempoten", async () => {
  const migration = await readFile("drizzle/0014_workspace_owner_backfill.sql", "utf8");
  assert.match(migration, /WHERE NOT EXISTS[\s\S]+legacy_merchant_workspace_links/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /INSERT INTO workspaces/i);
  assert.match(migration, /INSERT INTO workspace_memberships/i);
  assert.match(migration, /'OWNER', 'ACTIVE'/i);
  assert.match(migration, /INSERT INTO legacy_merchant_workspace_links/i);
});

test("pendaftaran merchant baru memprovisi workspace dalam transaksi yang sama", async () => {
  const registration = await readFile("src/app/actions/auth.ts", "utf8");
  assert.match(registration, /db\.transaction/);
  assert.match(registration, /tx\.insert\(merchantProfiles\)/);
  assert.match(registration, /tx\.insert\(workspaces\)/);
  assert.match(registration, /tx\.insert\(workspaceMemberships\)/);
  assert.match(registration, /tx\.insert\(legacyMerchantWorkspaceLinks\)/);
});
