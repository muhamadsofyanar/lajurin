CREATE TYPE "public"."workspace_domain_status" AS ENUM('PENDING', 'VERIFIED', 'FAILED', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."workspace_kind" AS ENUM('INTERNAL', 'EXTERNAL');--> statement-breakpoint
CREATE TYPE "public"."workspace_membership_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."workspace_membership_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."workspace_status" AS ENUM('DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED');--> statement-breakpoint
CREATE TABLE "legacy_merchant_workspace_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_profile_id" uuid NOT NULL,
	"legacy_merchant_user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_branding" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"logo_url" text,
	"accent_color" text DEFAULT '#163d2d' NOT NULL,
	"support_email" text,
	"whatsapp" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"status" "workspace_domain_status" DEFAULT 'PENDING' NOT NULL,
	"verification_token_hash" text NOT NULL,
	"verified_at" timestamp with time zone,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_membership_role" DEFAULT 'MEMBER' NOT NULL,
	"status" "workspace_membership_status" DEFAULT 'INVITED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"module_key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" "workspace_kind" DEFAULT 'EXTERNAL' NOT NULL,
	"status" "workspace_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "legacy_merchant_workspace_links" ADD CONSTRAINT "legacy_merchant_workspace_links_merchant_profile_id_merchant_profiles_id_fk" FOREIGN KEY ("merchant_profile_id") REFERENCES "public"."merchant_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_merchant_workspace_links" ADD CONSTRAINT "legacy_merchant_workspace_links_legacy_merchant_user_id_users_id_fk" FOREIGN KEY ("legacy_merchant_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_merchant_workspace_links" ADD CONSTRAINT "legacy_merchant_workspace_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_branding" ADD CONSTRAINT "workspace_branding_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_domains" ADD CONSTRAINT "workspace_domains_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_modules" ADD CONSTRAINT "workspace_modules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_workspace_links_profile_unique" ON "legacy_merchant_workspace_links" USING btree ("merchant_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_workspace_links_user_unique" ON "legacy_merchant_workspace_links" USING btree ("legacy_merchant_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_workspace_links_workspace_unique" ON "legacy_merchant_workspace_links" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_domains_hostname_unique" ON "workspace_domains" USING btree ("hostname");--> statement-breakpoint
CREATE INDEX "workspace_domains_workspace_status_idx" ON "workspace_domains" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_memberships_workspace_user_unique" ON "workspace_memberships" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_memberships_user_status_idx" ON "workspace_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "workspace_memberships_workspace_status_idx" ON "workspace_memberships" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_modules_workspace_key_unique" ON "workspace_modules" USING btree ("workspace_id","module_key");--> statement-breakpoint
CREATE INDEX "workspace_modules_workspace_enabled_idx" ON "workspace_modules" USING btree ("workspace_id","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_unique" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "workspaces_status_idx" ON "workspaces" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_created_idx" ON "audit_logs" USING btree ("workspace_id","created_at");