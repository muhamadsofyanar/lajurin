DO $$
DECLARE
	merchant record;
	workspace_uuid uuid;
	base_slug text;
	target_slug text;
	suffix text;
	collision_counter integer;
BEGIN
	FOR merchant IN
		SELECT mp.id, mp.user_id, mp.brand_name, mp.slug, mp.logo_url,
			mp.support_email, mp.whatsapp, mp.accent_color, mp.status
		FROM merchant_profiles mp
		WHERE NOT EXISTS (
			SELECT 1 FROM legacy_merchant_workspace_links link
			WHERE link.merchant_profile_id = mp.id
		)
		ORDER BY mp.id
	LOOP
		PERFORM pg_advisory_xact_lock(hashtext(merchant.id::text));

		CONTINUE WHEN EXISTS (
			SELECT 1 FROM legacy_merchant_workspace_links link
			WHERE link.merchant_profile_id = merchant.id
		);

		base_slug := left(trim(both '-' from lower(regexp_replace(
			coalesce(nullif(trim(merchant.slug), ''), merchant.brand_name),
			'[^a-zA-Z0-9]+', '-', 'g'
		))), 72);
		IF length(base_slug) < 2 THEN
			base_slug := 'workspace-' || left(replace(merchant.id::text, '-', ''), 12);
		END IF;

		target_slug := base_slug;
		suffix := left(replace(merchant.id::text, '-', ''), 8);
		collision_counter := 0;
		WHILE EXISTS (SELECT 1 FROM workspaces WHERE slug = target_slug) LOOP
			collision_counter := collision_counter + 1;
			IF collision_counter = 1 THEN
				target_slug := left(base_slug, 63) || '-' || suffix;
			ELSE
				target_slug := left(base_slug, greatest(2, 61 - length(collision_counter::text)))
					|| '-' || suffix || '-' || collision_counter::text;
			END IF;
		END LOOP;

		workspace_uuid := gen_random_uuid();
		INSERT INTO workspaces (id, name, slug, kind, status, created_by)
		VALUES (
			workspace_uuid,
			left(trim(merchant.brand_name), 120),
			target_slug,
			'EXTERNAL',
			CASE merchant.status::text
				WHEN 'ACTIVE' THEN 'ACTIVE'::workspace_status
				WHEN 'SUSPENDED' THEN 'SUSPENDED'::workspace_status
				ELSE 'DRAFT'::workspace_status
			END,
			merchant.user_id
		);

		INSERT INTO workspace_memberships (workspace_id, user_id, role, status)
		VALUES (workspace_uuid, merchant.user_id, 'OWNER', 'ACTIVE');

		INSERT INTO workspace_branding (
			workspace_id, display_name, logo_url, accent_color, support_email, whatsapp
		) VALUES (
			workspace_uuid, merchant.brand_name, merchant.logo_url,
			merchant.accent_color, merchant.support_email, merchant.whatsapp
		);

		INSERT INTO legacy_merchant_workspace_links (
			merchant_profile_id, legacy_merchant_user_id, workspace_id
		) VALUES (merchant.id, merchant.user_id, workspace_uuid);

		INSERT INTO audit_logs (
			workspace_id, request_id, action, entity_type, entity_id, metadata
		) VALUES (
			workspace_uuid,
			'workspace-backfill-migration-0014',
			'WORKSPACE_BACKFILLED',
			'workspace',
			workspace_uuid::text,
			jsonb_build_object('source', 'merchant_profile', 'schemaVersion', 1, 'automatic', true)
		);
	END LOOP;
END $$;
