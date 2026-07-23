import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("domain utama produksi tidak diperlakukan sebagai custom domain merchant", async () => {
  const proxy = await source("src/proxy.ts");
  const hostnames = await source("src/lib/hostnames.ts");
  assert.match(hostnames, /"legaone\.id", "www\.legaone\.id"/);
  assert.match(proxy, /request\.headers\.get\("host"\)/);
  assert.match(proxy, /request\.headers\.get\("x-forwarded-host"\)/);
  assert.match(hostnames, /PLATFORM_HOSTNAMES/);
});

test("routing root mengenali host publik saat URL internal reverse proxy digunakan", () => {
  const response = proxy(new NextRequest("http://rizqhub-container:3000/", {
    headers: { host: "legaone.id" },
  }));
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("x-middleware-rewrite"), null);
});

test("routing root mengenali forwarded host Coolify yang berantai", () => {
  const response = proxy(new NextRequest("http://rizqhub-container:3000/", {
    headers: {
      host: "rizqhub-container:3000",
      "x-forwarded-host": "legaone.id, coolify-proxy",
    },
  }));
  assert.equal(response.headers.get("x-middleware-next"), "1");
  assert.equal(response.headers.get("x-middleware-rewrite"), null);
});

test("custom domain merchant tetap diarahkan ke resolver domain", () => {
  const response = proxy(new NextRequest("https://kelas.contoh.id/", {
    headers: { host: "kelas.contoh.id" },
  }));
  assert.match(response.headers.get("x-middleware-rewrite") ?? "", /\/d\/kelas\.contoh\.id$/);
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
