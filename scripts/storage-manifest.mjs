import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const roots = ["payment-proofs", "commission-proofs", "course-files", "landing-media", "community-media", "service-documents", "digital-products"]
  .map((name) => path.join(process.cwd(), "data", name));

const files = [];
const missingStorages = [];
for (const root of roots) {
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); }
  catch { missingStorages.push(path.basename(root)); continue; }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(root, entry.name);
    const [info, bytes] = await Promise.all([stat(fullPath), readFile(fullPath)]);
    files.push({
      storage: path.basename(root), file: entry.name, bytes: info.size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
}
files.sort((a, b) => `${a.storage}/${a.file}`.localeCompare(`${b.storage}/${b.file}`));
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), missingStorages, fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), files }, null, 2));
if (missingStorages.length) process.exitCode = 1;
