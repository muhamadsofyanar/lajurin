import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "docs", "architecture", "baseline-files.sha256");
const manifest = await readFile(manifestPath, "utf8");
const failures = [];

for (const rawLine of manifest.split("\n")) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/);
  if (!match) throw new Error(`Format manifest tidak valid: ${line}`);
  const [, expected, relativePath] = match;
  try {
    const content = await readFile(path.join(root, relativePath));
    const actual = createHash("sha256").update(content).digest("hex");
    if (actual !== expected) failures.push(relativePath);
  } catch {
    failures.push(relativePath);
  }
}

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (packageJson.version !== "1.0.1") failures.push("package.json#version");

if (failures.length) {
  console.error(JSON.stringify({ level: "error", event: "baseline_mismatch", files: failures }));
  process.exit(1);
}

console.info(JSON.stringify({ level: "info", event: "baseline_verified", version: packageJson.version }));
