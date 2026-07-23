import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { merchantCan, visibleMerchantCapabilities } from "../src/lib/merchant-access";
import { isPlatformHostname, normalizeHostname } from "../src/lib/hostnames";
import {
  BROADCAST_MAX_ATTEMPTS,
  BROADCAST_MAX_RECIPIENTS,
  broadcastBatchSize,
  broadcastDailyRecipientLimit,
} from "../src/lib/broadcasts";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("matriks Staff hanya membuka data dan operasional dasar", () => {
  assert.deepEqual(visibleMerchantCapabilities("STAFF"), ["read", "manage"]);
  assert.equal(merchantCan("STAFF", "read"), true);
  assert.equal(merchantCan("STAFF", "manage"), true);
  for (const restricted of ["members", "finance", "broadcast", "domains"] as const) {
    assert.equal(merchantCan("STAFF", restricted), false, `Staff tidak boleh memiliki ${restricted}`);
  }
});

test("matriks Owner Admin Finance dan Member tidak melebar", () => {
  for (const capability of ["read", "manage", "members", "finance", "broadcast", "domains"] as const) {
    assert.equal(merchantCan("OWNER", capability), true);
  }
  assert.equal(merchantCan("ADMIN", "members"), true);
  assert.equal(merchantCan("ADMIN", "broadcast"), true);
  assert.equal(merchantCan("ADMIN", "finance"), false);
  assert.deepEqual(visibleMerchantCapabilities("FINANCE"), ["read", "finance"]);
  assert.deepEqual(visibleMerchantCapabilities("MEMBER"), []);
});

test("navigasi dan Server Action memakai capability yang sama", async () => {
  const nav = await source("src/components/nav.tsx");
  const domain = await source("src/app/actions/domain.ts");
  const broadcast = await source("src/app/actions/broadcast.ts");
  assert.match(nav, /can\("finance"\).*Saldo & payout/);
  assert.match(nav, /can\("broadcast"\).*Broadcast pelanggan/);
  assert.match(nav, /can\("domains"\).*Custom Domain/);
  assert.match(domain, /requireMerchantWorkspace\("workspace\.manage", "domains"\)/);
  assert.match(broadcast, /requireMerchant\("broadcast"\)/);
});

test("membership aktif menentukan peran owner lama dan akun nonaktif tidak berputar redirect", async () => {
  const auth = await source("src/lib/auth.ts");
  assert.match(auth, /if \(access\) return access;[\s\S]*if \(!ownedProfile \|\| ownedProfile\.workspaceId\) return null/);
  assert.match(auth, /if \(!access\) redirect\("\/member\?error=Akses\+workspace\+tidak\+aktif"\)/);
});

test("draft builder tidak mengubah urutan atau media publik", async () => {
  const action = await source("src/app/actions/merchant.ts");
  assert.match(action, /draftData = \{[\s\S]*sectionOrder/);
  assert.match(action, /publishData = parsed\.data\.intent === "PUBLISH" \? \{ \.\.\.landingData, sectionOrder/);
  assert.match(action, /values\(\{ productId, draftData: nextDraft \}\)/);
  assert.doesNotMatch(action, /values\(\{ productId, \.\.\.field \}\)/);
});

test("domain utama dan turunannya tidak dapat diambil merchant", () => {
  assert.equal(normalizeHostname("HTTPS://LEGAONE.ID:443/path"), "legaone.id");
  assert.equal(isPlatformHostname("legaone.id"), true);
  assert.equal(isPlatformHostname("www.legaone.id"), true);
  assert.equal(isPlatformHostname("merchant.legaone.id"), true);
  assert.equal(isPlatformHostname("kelas-domain-sendiri.id"), false);
});

test("verifikasi domain memeriksa TXT CNAME dan HTTPS", async () => {
  const action = await source("src/app/actions/domain.ts");
  assert.match(action, /resolveTxt/);
  assert.match(action, /resolveCname/);
  assert.match(action, /https:\/\/\$\{domain\.hostname\}\/api\/health/);
  assert.match(action, /sslStatus: sslVerified \? "ACTIVE"/);
});

test("broadcast memiliki batas konservatif dan antrean terkunci", async () => {
  assert.equal(BROADCAST_MAX_RECIPIENTS, 100);
  assert.equal(BROADCAST_MAX_ATTEMPTS, 3);
  assert.equal(broadcastBatchSize(99) <= 50, true);
  assert.equal(broadcastDailyRecipientLimit() >= 1, true);
  const queue = await source("src/lib/broadcasts.ts");
  const action = await source("src/app/actions/broadcast.ts");
  assert.match(queue, /FOR UPDATE OF d SKIP LOCKED/);
  assert.match(queue, /broadcastDeliveryAttempts/);
  assert.match(action, /eq\(orders\.marketingConsent, true\)/);
  assert.match(action, /status: "QUEUED"/);
  assert.match(action, /consentCapturedAt/);
});

test("stabilisasi menambah pemeriksaan webhook dan monitoring proses", async () => {
  const webhook = await source("src/app/api/xendit/webhook/route.ts");
  const instrumentation = await source("src/lib/process-monitoring.ts");
  const operations = await source("src/app/admin/operations/page.tsx");
  assert.match(webhook, /row\.order\.paymentMethod !== "XENDIT"/);
  assert.match(webhook, /Timestamp webhook berada di masa depan/);
  assert.match(instrumentation, /uncaughtExceptionMonitor/);
  assert.match(instrumentation, /unhandledRejection/);
  assert.match(operations, /failedWebhooks/);
  assert.match(operations, /queuedBroadcasts/);
});
