-- Manual incremental setup for the EXISTING external database only.
-- Migration tooling is unavailable here. Do not replay historical migrations.
-- Adds the homepage hero (featured anime) configuration to the existing
-- site_settings singleton. Public visitors read it through the existing
-- site_settings SELECT policy; admins write through the existing
-- site_settings UPDATE policy, so no new tables, policies, or grants.
BEGIN;
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS hero jsonb NOT NULL DEFAULT '{"enabled": false, "items": []}'::jsonb
  CHECK (jsonb_typeof(hero) = 'object');
COMMIT;
