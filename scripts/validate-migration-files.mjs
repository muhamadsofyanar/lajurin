import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const drizzleRoot = path.join(root, "drizzle");
const journal = JSON.parse(await readFile(path.join(drizzleRoot, "meta", "_journal.json"), "utf8"));
const manifest = await readFile(path.join(drizzleRoot, "migrations.sha256"), "utf8");
const hashes = new Map();

for (const rawLine of manifest.split("\n")) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const match = line.match(/^([a-f0-9]{64})\s{2}(.+\.sql)$/);
  if (!match) throw new Error(`Format checksum migrasi tidak valid: ${line}`);
  hashes.set(match[2], match[1]);
}

const failures = [];
for (const [index, entry] of journal.entries.entries()) {
  if (entry.idx !== index) failures.push(`journal idx ${entry.idx} seharusnya ${index}`);
  const file = `${entry.tag}.sql`;
  const expected = hashes.get(file);
  if (!expected) {
    failures.push(`${file} tidak tercatat di manifest`);
    continue;
  }
  try {
    const content = await readFile(path.join(drizzleRoot, file));
    const actual = createHash("sha256").update(content).digest("hex");
    if (actual !== expected) failures.push(`${file} berubah dari baseline`);
  } catch {
    failures.push(`${file} tidak ditemukan`);
  }
}

for (const file of hashes.keys()) {
  if (!journal.entries.some((entry) => `${entry.tag}.sql` === file)) failures.push(`${file} tidak ada di journal`);
}

if (failures.length) {
  console.error(JSON.stringify({ level: "error", event: "migration_files_invalid", failures }));
  process.exit(1);
}

console.info(JSON.stringify({ level: "info", event: "migration_files_valid", count: journal.entries.length }));
