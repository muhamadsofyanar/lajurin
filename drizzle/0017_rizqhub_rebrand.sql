UPDATE "community_spaces"
SET
  "name" = 'Komunitas Rizqhub',
  "description" = 'Ruang bersama untuk seluruh member Rizqhub.',
  "updated_at" = now()
WHERE "id" = '00000000-0000-4000-8000-000000000009'
  AND "merchant_id" IS NULL
  AND "product_id" IS NULL;
