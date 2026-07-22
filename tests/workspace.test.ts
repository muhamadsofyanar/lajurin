import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type { WorkspaceRepository } from "../src/modules/workspace/application/contracts";
import { listAvailableWorkspaces, resolveWorkspaceBySlug } from "../src/modules/workspace/application/workspace-service";
import { WorkspaceAccessError } from "../src/modules/workspace/domain/errors";
import { assertOwnerInvariant, hasWorkspacePermission } from "../src/modules/workspace/domain/policy";
import type { ActorContext, WorkspaceContext, WorkspaceMembershipRecord } from "../src/modules/workspace/domain/types";
import { normalizeHostname, normalizeWorkspaceSlug, validateModuleSettings } from "../src/modules/workspace/domain/validation";
import { isWorkspaceCanaryUser } from "../src/platform/feature-flags/workspace";

const actor: ActorContext = { userId: "user-a", platformRole: "MERCHANT", requestId: "request-1" };
const record: WorkspaceMembershipRecord = {
  workspaceId: "workspace-a",
  workspaceName: "Usaha A",
  workspaceSlug: "usaha-a",
  workspaceKind: "EXTERNAL",
  workspaceStatus: "ACTIVE",
  membershipId: "membership-a",
  membershipRole: "OWNER",
  membershipStatus: "ACTIVE",
};

function repository(records: Record<string, WorkspaceMembershipRecord>): WorkspaceRepository {
  return {
    async findMembershipBySlug(userId, slug) {
      return records[`${userId}:${slug}`] ?? null;
    },
    async findMembershipById(userId, workspaceId) {
      return Object.entries(records).find(([key, value]) => key.startsWith(`${userId}:`) && value.workspaceId === workspaceId)?.[1] ?? null;
    },
    async listMemberships(userId) {
      return Object.entries(records).filter(([key]) => key.startsWith(`${userId}:`)).map(([, value]) => value);
    },
    async countActiveOwners() { return 1; },
    async getBranding() { return null; },
    async listModules() { return []; },
    async writeAudit() {},
  };
}

test("resolver membentuk context immutable dan menolak akses lintas workspace", async () => {
  const repo = repository({ "user-a:usaha-a": record, "user-b:usaha-b": { ...record, workspaceId: "workspace-b", workspaceSlug: "usaha-b" } });
  const context = await resolveWorkspaceBySlug(actor, "usaha-a", repo);
  assert.equal(context.workspaceId, "workspace-a");
  assert.equal(Object.isFrozen(context), true);
  await assert.rejects(() => resolveWorkspaceBySlug(actor, "usaha-b", repo), (error: unknown) => {
    return error instanceof WorkspaceAccessError && error.code === "WORKSPACE_NOT_FOUND";
  });
});

test("resolver menolak membership atau workspace yang tidak aktif", async () => {
  const membershipSuspended = repository({ "user-a:usaha-a": { ...record, membershipStatus: "SUSPENDED" } });
  await assert.rejects(() => resolveWorkspaceBySlug(actor, "usaha-a", membershipSuspended), (error: unknown) => {
    return error instanceof WorkspaceAccessError && error.code === "MEMBERSHIP_INACTIVE";
  });
  const workspaceSuspended = repository({ "user-a:usaha-a": { ...record, workspaceStatus: "SUSPENDED" } });
  await assert.rejects(() => resolveWorkspaceBySlug(actor, "usaha-a", workspaceSuspended), (error: unknown) => {
    return error instanceof WorkspaceAccessError && error.code === "WORKSPACE_INACTIVE";
  });
});

test("daftar workspace hanya memuat workspace dan membership aktif", async () => {
  const repo = repository({
    "user-a:usaha-a": record,
    "user-a:usaha-b": { ...record, workspaceId: "workspace-b", workspaceSlug: "usaha-b", membershipRole: "MEMBER" },
    "user-a:usaha-c": { ...record, workspaceId: "workspace-c", workspaceSlug: "usaha-c", workspaceStatus: "DRAFT" },
  });
  const available = await listAvailableWorkspaces(actor, repo);
  assert.deepEqual(available.map((item) => item.workspaceSlug), ["usaha-a", "usaha-b"]);
});

test("policy membatasi billing ke owner dan melindungi owner terakhir", () => {
  const ownerContext = { ...record, workspaceSlug: record.workspaceSlug } satisfies WorkspaceContext;
  assert.equal(hasWorkspacePermission(ownerContext, "workspace.billing.manage"), true);
  assert.equal(hasWorkspacePermission({ ...ownerContext, membershipRole: "ADMIN" }, "workspace.billing.manage"), false);
  assert.throws(() => assertOwnerInvariant({
    currentRole: "OWNER", currentStatus: "ACTIVE", nextRole: "ADMIN", nextStatus: "ACTIVE", activeOwnerCount: 1,
  }), (error: unknown) => error instanceof WorkspaceAccessError && error.code === "LAST_OWNER");
  assert.doesNotThrow(() => assertOwnerInvariant({
    currentRole: "OWNER", currentStatus: "ACTIVE", nextRole: "ADMIN", nextStatus: "ACTIVE", activeOwnerCount: 2,
  }));
});

test("slug, hostname, module settings, dan canary dinormalisasi ketat", () => {
  assert.equal(normalizeWorkspaceSlug("  Toko Édukasi  "), "toko-edukasi");
  assert.equal(normalizeHostname("Kelas.Example.COM."), "kelas.example.com");
  assert.throws(() => normalizeHostname("https://example.com/path"));
  assert.deepEqual(validateModuleSettings("COURSES", { certificateEnabled: true }), { certificateEnabled: true });
  assert.throws(() => validateModuleSettings("UNKNOWN", {}));
  assert.throws(() => validateModuleSettings("FINANCE", { arbitraryDomainState: true }));

  const env = { ...process.env, WORKSPACE_FOUNDATION_ENABLED: "true", WORKSPACE_CANARY_USER_IDS: "user-a,user-b" };
  assert.equal(isWorkspaceCanaryUser("user-a", env), true);
  assert.equal(isWorkspaceCanaryUser("user-c", env), false);
  assert.equal(isWorkspaceCanaryUser("user-a", { ...env, WORKSPACE_FOUNDATION_ENABLED: "false" }), false);
});

test("domain workspace tidak bergantung pada Next.js, Drizzle, atau compatibility lib", async () => {
  const domainRoot = path.join(process.cwd(), "src/modules/workspace/domain");
  const files = (await readdir(domainRoot)).filter((file) => file.endsWith(".ts"));
  for (const file of files) {
    const source = await readFile(path.join(domainRoot, file), "utf8");
    assert.doesNotMatch(source, /from ["'](?:next|drizzle-orm|@\/lib)/, `${file} melanggar boundary domain`);
  }
});
