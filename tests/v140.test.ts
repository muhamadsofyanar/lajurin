import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("migration 0015 menambah token akun, draft builder, domain, dan broadcast secara aditif", async () => {
  const migration = await source("drizzle/0015_team_accounts_visual_builder.sql");
  assert.match(migration, /CREATE TABLE "workspace_invitations"/);
  assert.match(migration, /CREATE TABLE "password_reset_tokens"/);
  assert.match(migration, /ADD COLUMN "draft_data" jsonb/);
  assert.match(migration, /CREATE TABLE "broadcast_campaigns"/);
  assert.match(migration, /'CUSTOM_DOMAINS'[\s\S]*'OFF'/);
  assert.match(migration, /'CUSTOMER_BROADCASTS'[\s\S]*'OFF'/);
});

test("akun tim memakai owner merchant dengan capability berbasis role", async () => {
  const auth = await source("src/lib/auth.ts");
  const access = await source("src/lib/merchant-access.ts");
  assert.match(access, /FINANCE: \["read", "finance"\]/);
  assert.match(access, /STAFF: \["read", "manage"\]/);
  assert.match(auth, /legacyMerchantWorkspaceLinks\.legacyMerchantUserId/);
  assert.match(auth, /merchantCan\(access\.membershipRole, capability\)/);
});

test("undangan dan reset password memakai token acak yang hanya disimpan sebagai hash", async () => {
  const workspace = await source("src/app/actions/workspace.ts");
  const auth = await source("src/app/actions/auth.ts");
  assert.match(workspace, /randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(workspace, /tokenHash: invitationTokenHash\(token\)/);
  assert.match(auth, /tokenHash: accountTokenHash\(token\)/);
  assert.match(auth, /await tx\.delete\(sessions\)/);
});

test("builder memisahkan simpan draft dan publish", async () => {
  const action = await source("src/app/actions/merchant.ts");
  const builder = await source("src/components/visual-landing-builder.tsx");
  assert.match(action, /intent: z\.enum\(\["DRAFT", "PUBLISH"\]\)/);
  assert.match(action, /publishedAt: new Date\(\)/);
  assert.match(builder, /name="intent" value="DRAFT"/);
  assert.match(builder, /name="intent" value="PUBLISH"/);
});
