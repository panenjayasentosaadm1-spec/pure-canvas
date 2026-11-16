-- Manual incremental setup for the EXISTING external database only.
-- Migration tooling is unavailable here. Do not replay historical migrations.
BEGIN;
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS ad_slots jsonb NOT NULL DEFAULT '{}'::jsonb
  CHECK (jsonb_typeof(ad_slots) = 'object');

-- Reuse existing public-read/admin-write RLS on the singleton settings row.
CREATE OR REPLACE FUNCTION public.save_ad_slot(_slot text, _code text, _enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Akses admin diperlukan.' USING ERRCODE = '42501';
  END IF;
  IF _slot IS NULL OR _slot NOT IN ('homepage_banner_1', 'homepage_banner_2', 'social_bar', 'popunder') THEN
    RAISE EXCEPTION 'Slot iklan tidak valid.';
  END IF;
  IF _code IS NULL OR _enabled IS NULL THEN
    RAISE EXCEPTION 'Kode dan status iklan wajib diisi.';
  END IF;
  UPDATE public.site_settings
    SET ad_slots = jsonb_set(ad_slots, ARRAY[_slot], jsonb_build_object('code', _code, 'enabled', _enabled), true), updated_at = now()
    WHERE id = 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengaturan situs tidak ditemukan atau akses ditolak.';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.save_ad_slot(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_ad_slot(text, text, boolean) TO authenticated;
COMMIT;