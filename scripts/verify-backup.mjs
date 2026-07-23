import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";

const backupFile = process.argv[2];
if (!backupFile) throw new Error("Gunakan: npm run ops:backup:verify -- /path/rizqhub.dump");
await access(backupFile, constants.R_OK);

await new Promise((resolve, reject) => {
  const child = spawn("pg_restore", ["--list", backupFile], { stdio: ["ignore", "ignore", "inherit"] });
  child.once("error", reject);
  child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`pg_restore --list gagal dengan exit code ${code}`)));
});

const checksum = createHash("sha256");
await new Promise((resolve, reject) => {
  createReadStream(backupFile).on("data", (chunk) => checksum.update(chunk)).once("error", reject).once("end", resolve);
});
const actual = checksum.digest("hex");
let expected = null;
try {
  const metadata = JSON.parse(await readFile(`${backupFile}.json`, "utf8"));
  expected = typeof metadata.sha256 === "string" ? metadata.sha256 : null;
} catch {
  expected = process.env.BACKUP_SHA256?.trim() || null;
}
if (expected && actual !== expected) throw new Error("Checksum backup tidak cocok.");
const file = await stat(backupFile);
console.info(JSON.stringify({
  level: "info",
  event: "backup_verified",
  sizeBytes: file.size,
  sha256: actual,
  checksumMatched: expected ? true : null,
  archiveReadable: true,
}));
