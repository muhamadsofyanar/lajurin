import assert from "node:assert/strict";
import test from "node:test";
import { evaluateFeatureFlag } from "../src/lib/feature-flags";
import { reportPeriodStart, safeCsvCell } from "../src/lib/reporting";
import { hasWorkspacePermission } from "../src/modules/workspace/domain/policy";

test("feature flag OFF selalu nonaktif", () => {
  assert.equal(evaluateFeatureFlag({ rollout: "OFF", audienceUserIds: ["user-1"] }, "user-1"), false);
});

test("feature flag ALL aktif tanpa audience", () => {
  assert.equal(evaluateFeatureFlag({ rollout: "ALL", audienceUserIds: [] }), true);
});

test("feature flag USERS hanya aktif untuk audience", () => {
  const flag = { rollout: "USERS" as const, audienceUserIds: ["user-1"] };
  assert.equal(evaluateFeatureFlag(flag, "user-1"), true);
  assert.equal(evaluateFeatureFlag(flag, "user-2"), false);
});

test("CSV melindungi formula injection dan quote", () => {
  assert.equal(safeCsvCell("=1+1"), '"\'=1+1"');
  assert.equal(safeCsvCell('a"b'), '"a""b"');
});

test("periode laporan all tidak memiliki batas awal", () => {
  assert.equal(reportPeriodStart("all"), null);
});

test("periode laporan dihitung dari waktu acuan", () => {
  assert.equal(reportPeriodStart("30", new Date("2026-07-23T00:00:00.000Z"))?.toISOString(), "2026-06-23T00:00:00.000Z");
});

test("role Finance hanya memiliki akses billing dan read", () => {
  const context = { workspaceId: "w", workspaceSlug: "w", workspaceStatus: "ACTIVE" as const, membershipId: "m", membershipRole: "FINANCE" as const, membershipStatus: "ACTIVE" as const };
  assert.equal(hasWorkspacePermission(context, "workspace.read"), true);
  assert.equal(hasWorkspacePermission(context, "workspace.billing.manage"), true);
  assert.equal(hasWorkspacePermission(context, "workspace.members.manage"), false);
});
