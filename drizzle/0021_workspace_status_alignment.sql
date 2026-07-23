UPDATE "workspaces" AS "workspace"
SET "status" = 'ACTIVE', "updated_at" = now()
FROM "legacy_merchant_workspace_links" AS "link"
INNER JOIN "merchant_profiles" AS "profile"
  ON "profile"."user_id" = "link"."legacy_merchant_user_id"
WHERE "workspace"."id" = "link"."workspace_id"
  AND "profile"."status" = 'ACTIVE'
  AND "workspace"."status" = 'DRAFT';--> statement-breakpoint
UPDATE "workspaces" AS "workspace"
SET "status" = 'SUSPENDED', "updated_at" = now()
FROM "legacy_merchant_workspace_links" AS "link"
INNER JOIN "merchant_profiles" AS "profile"
  ON "profile"."user_id" = "link"."legacy_merchant_user_id"
WHERE "workspace"."id" = "link"."workspace_id"
  AND "profile"."status" = 'SUSPENDED'
  AND "workspace"."status" <> 'SUSPENDED';
