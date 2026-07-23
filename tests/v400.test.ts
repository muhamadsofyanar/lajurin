import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("v4 includes the RizqHub brand and trust center", () => {
  assert.match(read("src/app/manifesto/page.tsx"), /Menjadi Jalan Rezeki/);
  assert.match(read("src/app/trust/page.tsx"), /Trust Center/);
  assert.ok(existsSync("public/images/rizqhub-hero-ecosystem.webp"));
  assert.ok(existsSync("public/images/rizqhub-impact-community.webp"));
});

test("v4 includes trust, affiliate, and impact operations", () => {
  const schema = read("src/lib/schema.ts");
  assert.match(schema, /affiliatePayoutRequests/);
  assert.match(schema, /productReports/);
  assert.match(schema, /verificationLevel/);
  assert.match(read("src/app/r/[code]/route.ts"), /affiliateClicks/);
  assert.match(read("src/app/admin/impact/page.tsx"), /Dampak RizqHub/);
  assert.ok(existsSync("drizzle/0024_trust_growth_impact.sql"));
});
