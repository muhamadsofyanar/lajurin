import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
const requestedDirectory = process.argv[2];
if (!databaseUrl) throw new Error("DATABASE_URL wajib diisi.");
if (!requestedDirectory) throw new Error("Gunakan: npm run ops:backup -- /path/backup-terpisah");

const outputDirectory = path.resolve(requestedDirectory);
if (outputDirectory === "/" || outputDirectory === process.cwd()) {
  throw new Error("Direktori backup harus spesifik dan berada di luar root source.");
}
const parsed = new URL(databaseUrl);
if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("DATABASE_URL harus PostgreSQL.");

await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(outputDirectory, `rizqhub-${timestamp}.dump`);
const metadataFile = `${backupFile}.json`;
const childEnvironment = {
  ...process.env,
  PGHOST: parsed.hostname,
  PGPORT: parsed.port || "5432",
  PGDATABASE: parsed.pathname.replace(/^\//, ""),
  PGUSER: decodeURIComponent(parsed.username),
  PGPASSWORD: decodeURIComponent(parsed.password),
};

await new Promise((resolve, reject) => {
  const child = spawn("pg_dump", ["--format=custom", "--no-owner", "--no-acl", `--file=${backupFile}`], {
    env: childEnvironment,
    stdio: ["ignore", "inherit", "inherit"],
  });
  child.once("error", reject);
  child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`pg_dump gagal dengan exit code ${code}`)));
});

const checksum = createHash("sha256");
await new Promise((resolve, reject) => {
  createReadStream(backupFile).on("data", (chunk) => checksum.update(chunk)).once("error", reject).once("end", resolve);
});
const file = await stat(backupFile);
const metadata = {
  createdAt: new Date().toISOString(),
  filename: path.basename(backupFile),
  sizeBytes: file.size,
  sha256: checksum.digest("hex"),
  format: "postgres-custom",
};
await writeFile(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600, flag: "wx" });
console.info(JSON.stringify({ level: "info", event: "backup_created", ...metadata }));
