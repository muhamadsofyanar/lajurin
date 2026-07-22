import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const script = path.resolve("scripts/validate-env.mjs");
const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DEPLOYMENT_ENV: "test",
  DATABASE_URL: "postgresql://user:password@localhost:5432/lajurin_test",
  APP_URL: "http://localhost:3000",
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: Buffer.alloc(32, "a").toString("base64"),
  NOTIFICATIONS_ENABLED: "false",
  MANUAL_BANK_NAME: "TEST",
  MANUAL_BANK_ACCOUNT: "0000000000",
  MANUAL_BANK_HOLDER: "TEST",
};

function validate(environment: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [script], { env: environment, encoding: "utf8" });
}

test("konfigurasi minimum yang valid diterima tanpa membocorkan nilai", () => {
  const result = validate(validEnvironment);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /configuration_valid/);
  assert.doesNotMatch(result.stdout, /password/);
});

test("konfigurasi wajib yang hilang membuat startup gagal", () => {
  const result = validate({ NODE_ENV: "test", DEPLOYMENT_ENV: "test" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL wajib diisi/);
  assert.match(result.stderr, /NEXT_SERVER_ACTIONS_ENCRYPTION_KEY wajib diisi/);
});

test("credential Xendit harus diaktifkan berpasangan", () => {
  const result = validate({ ...validEnvironment, XENDIT_SECRET_KEY: "sandbox-secret" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /XENDIT_SECRET_KEY dan XENDIT_WEBHOOK_TOKEN harus diisi bersama/);
});

test("Workspace Foundation hanya aktif dengan UUID canary eksplisit", () => {
  const missingCanary = validate({ ...validEnvironment, WORKSPACE_FOUNDATION_ENABLED: "true" });
  assert.equal(missingCanary.status, 1);
  assert.match(missingCanary.stderr, /WORKSPACE_CANARY_USER_IDS wajib diisi/);

  const invalidCanary = validate({ ...validEnvironment, WORKSPACE_FOUNDATION_ENABLED: "true", WORKSPACE_CANARY_USER_IDS: "owner@example.com" });
  assert.equal(invalidCanary.status, 1);
  assert.match(invalidCanary.stderr, /harus berisi UUID/);

  const validCanary = validate({ ...validEnvironment, WORKSPACE_FOUNDATION_ENABLED: "true", WORKSPACE_CANARY_USER_IDS: "123e4567-e89b-42d3-a456-426614174000" });
  assert.equal(validCanary.status, 0);
});
