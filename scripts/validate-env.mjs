import { Buffer } from "node:buffer";

const strict = process.argv.includes("--strict") || process.env.NODE_ENV === "production";
const deploymentEnv = process.env.DEPLOYMENT_ENV ?? (strict ? "production" : "development");
const errors = [];

if (!new Set(["development", "test", "staging", "production"]).has(deploymentEnv)) {
  errors.push("DEPLOYMENT_ENV harus development, test, staging, atau production");
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) errors.push(`${name} wajib diisi`);
  return value;
}

function configuredPair(first, second) {
  const firstSet = Boolean(process.env[first]?.trim());
  const secondSet = Boolean(process.env[second]?.trim());
  if (firstSet !== secondSet) errors.push(`${first} dan ${second} harus diisi bersama`);
}

const databaseUrl = required("DATABASE_URL");
if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) errors.push("DATABASE_URL harus menggunakan PostgreSQL");

const appUrl = required("APP_URL");
if (appUrl) {
  try {
    const parsed = new URL(appUrl);
    if (strict && parsed.protocol !== "https:") errors.push("APP_URL production harus menggunakan HTTPS");
  } catch {
    errors.push("APP_URL bukan URL yang valid");
  }
}

const actionKey = required("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY");
if (actionKey) {
  try {
    if (Buffer.from(actionKey, "base64").length !== 32) errors.push("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY harus Base64 32 byte");
  } catch {
    errors.push("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY bukan Base64 yang valid");
  }
}

for (const name of ["MANUAL_BANK_NAME", "MANUAL_BANK_ACCOUNT", "MANUAL_BANK_HOLDER"]) {
  const value = required(name);
  if (deploymentEnv === "production" && value && /replace-me|staging only/i.test(value)) errors.push(`${name} masih memakai placeholder`);
}

configuredPair("XENDIT_SECRET_KEY", "XENDIT_WEBHOOK_TOKEN");

if (strict) {
  const jobSecret = required("INTERNAL_JOB_SECRET");
  if (jobSecret && jobSecret.length < 32) errors.push("INTERNAL_JOB_SECRET minimal 32 karakter");
}
for (const [name, minimum, maximum] of [
  ["BROADCAST_BATCH_SIZE", 1, 50],
  ["BROADCAST_DAILY_RECIPIENT_LIMIT", 1, 10000],
]) {
  const raw = process.env[name]?.trim();
  if (raw && (!/^\d+$/.test(raw) || Number(raw) < minimum || Number(raw) > maximum)) {
    errors.push(`${name} harus bilangan ${minimum}-${maximum}`);
  }
}

const workspaceFoundationEnabled = process.env.WORKSPACE_FOUNDATION_ENABLED?.trim().toLowerCase();
if (workspaceFoundationEnabled && !new Set(["true", "false"]).has(workspaceFoundationEnabled)) {
  errors.push("WORKSPACE_FOUNDATION_ENABLED harus true atau false");
}
if (workspaceFoundationEnabled === "true") {
  const canaryIds = (process.env.WORKSPACE_CANARY_USER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!canaryIds.length) errors.push("WORKSPACE_CANARY_USER_IDS wajib diisi saat Workspace Foundation aktif");
  if (canaryIds.some((value) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))) {
    errors.push("WORKSPACE_CANARY_USER_IDS harus berisi UUID dipisahkan koma");
  }
}

if (process.env.NOTIFICATIONS_ENABLED === "true") {
  required("STARSENDER_API_KEY");
  required("MAILKETING_API_TOKEN");
  required("MAILKETING_FROM_EMAIL");
}

if (errors.length) {
  console.error(JSON.stringify({ level: "error", event: "configuration_invalid", errors }));
  process.exit(1);
}

console.info(JSON.stringify({ level: "info", event: "configuration_valid", strict, deploymentEnv }));
