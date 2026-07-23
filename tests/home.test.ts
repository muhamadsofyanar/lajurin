import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("domain utama produksi tidak diperlakukan sebagai custom domain merchant", async () => {
  const proxy = await source("src/proxy.ts");
  assert.match(proxy, /"legaone\.id", "www\.legaone\.id"/);
  assert.match(proxy, /configuredPlatformHostnames\(request\)\.has\(requestHostname\)/);
  assert.match(proxy, /PLATFORM_HOSTNAMES/);
});

test("home publik memiliki informasi produk dan jalur konversi yang lengkap", async () => {
  const home = await source("src/app/page.tsx");
  for (const content of [
    "Landing Page Builder",
    "Checkout & pembayaran",
    "Kursus & member area",
    "Tim workspace",
    "Pelanggan & broadcast",
    "Analitik usaha",
    "Pertanyaan umum",
  ]) {
    assert.match(home, new RegExp(content.replace(/[&]/g, "\\&")));
  }
  assert.match(home, /href="\/register"/);
  assert.match(home, /href="\/login"/);
});
