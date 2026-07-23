import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("branding aktif memakai Rizqhub", async () => {
  const [brand, layout, home, health] = await Promise.all([
    source("src/components/brand.tsx"),
    source("src/app/layout.tsx"),
    source("src/app/page.tsx"),
    source("src/app/api/health/route.ts"),
  ]);
  for (const content of [brand, layout, home]) assert.match(content, /Rizqhub/);
  assert.match(health, /service: "rizqhub"/);
});

test("rolling update mempertahankan identifier legacy", async () => {
  const [auth, workspace, analytics, domain] = await Promise.all([
    source("src/lib/auth.ts"),
    source("src/platform/auth/workspace-context.ts"),
    source("src/components/conversion-tracker.tsx"),
    source("src/app/actions/domain.ts"),
  ]);
  assert.match(auth, /lajurin_session/);
  assert.match(workspace, /lajurin_active_workspace/);
  assert.match(analytics, /lajurin_visitor/);
  assert.match(domain, /_lajurin/);
  assert.match(domain, /lajurin-verification/);
});

test("konfigurasi deployment mewajibkan secret dan menyediakan healthcheck", async () => {
  const [compose, dockerfile] = await Promise.all([
    source("docker-compose.yml"),
    source("Dockerfile"),
  ]);
  assert.match(compose, /INTERNAL_JOB_SECRET:\s+\$\{INTERNAL_JOB_SECRET:\?/);
  assert.match(dockerfile, /apk add --no-cache wget/);
  assert.match(dockerfile, /\/api\/ready/);
});
