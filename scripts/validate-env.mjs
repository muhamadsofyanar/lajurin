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
