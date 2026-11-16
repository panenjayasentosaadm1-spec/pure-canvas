-- Stage 4: per-movie comment switch. Manual incremental setup; run once AFTER
-- docs/movie-and-comments-setup.sql. Nothing in the app executes this file.
-- Additive only: existing anime get allow_comments = true; episode comments unchanged.
-- submit_guest_comment keeps the exact signature, security checks and grants from
-- movie-and-comments-setup.sql; only a movie-target allow_comments check is added.
BEGIN;

ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS allow_comments boolean NOT NULL DEFAULT true;
GRANT SELECT (allow_comments) ON public.anime TO anon, authenticated;
GRANT UPDATE (allow_comments) ON public.anime TO authenticated; -- harmless if table-level UPDATE already granted; RLS still applies
GRANT INSERT (allow_comments) ON public.anime TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_guest_comment(
  _content text,
  _episode_id uuid DEFAULT NULL, _author_name text DEFAULT NULL, _email text DEFAULT NULL,
  _parent_id uuid DEFAULT NULL, _client_token uuid DEFAULT NULL, _honeypot text DEFAULT NULL,
  _anime_id uuid DEFAULT NULL, _target_type text DEFAULT 'episode')
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  _headers json := NULLIF(pg_catalog.current_setting('request.headers', true), '')::json;
  _ip text;
  _ip_hash text;
  _key text;
  _hits integer;
  _name text := NULLIF(pg_catalog.btrim(COALESCE(_author_name, '')), '');
  _mail text := NULLIF(pg_catalog.lower(pg_catalog.btrim(COALESCE(_email, ''))), '');
  _body text := pg_catalog.btrim(COALESCE(_content, ''));
  _target uuid;
  _hash text;
  _id uuid;
BEGIN
  IF COALESCE(_honeypot, '') <> '' THEN
    RAISE EXCEPTION 'Komentar ditolak.' USING ERRCODE = '22023';
  END IF;

  -- Exactly one target, matching the declared type.
  IF _target_type = 'episode' THEN
    IF _episode_id IS NULL OR _anime_id IS NOT NULL THEN
      RAISE EXCEPTION 'Target komentar tidak valid.' USING ERRCODE = '22023';
    END IF;
    _target := _episode_id;
  ELSIF _target_type = 'movie' THEN
    IF _anime_id IS NULL OR _episode_id IS NOT NULL THEN
      RAISE EXCEPTION 'Target komentar tidak valid.' USING ERRCODE = '22023';
    END IF;
    _target := _anime_id;
  ELSE
    RAISE EXCEPTION 'Target komentar tidak valid.' USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.char_length(_body) < 2 OR pg_catalog.char_length(_body) > 1000 THEN
    RAISE EXCEPTION 'Komentar harus 2–1000 karakter.' USING ERRCODE = '22023';
  END IF;
  IF _name IS NOT NULL AND pg_catalog.char_length(_name) > 50 THEN
    RAISE EXCEPTION 'Nama maksimal 50 karakter.' USING ERRCODE = '22023';
  END IF;
  IF _mail IS NOT NULL AND (pg_catalog.char_length(_mail) > 254 OR _mail !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'Format email tidak valid.' USING ERRCODE = '22023';
  END IF;

  -- Target must exist and be published (movie: published anime of type movie).
  IF _target_type = 'episode' THEN
    IF NOT EXISTS (SELECT 1 FROM public.episodes AS e WHERE e.id = _episode_id AND e.is_published) THEN
      RAISE EXCEPTION 'Episode tidak ditemukan.' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.anime AS a
      WHERE a.id = _anime_id AND a.is_published AND a.type = 'movie') THEN
      RAISE EXCEPTION 'Movie tidak ditemukan.' USING ERRCODE = '22023';
    END IF;
    -- Stage 4: per-movie comment switch; existing comments stay readable.
    IF NOT EXISTS (SELECT 1 FROM public.anime AS a
      WHERE a.id = _anime_id AND a.allow_comments) THEN
      RAISE EXCEPTION 'Komentar dinonaktifkan untuk movie ini.' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Replies only within the same target, never across episode/movie.
  IF _parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.episode_comments AS p
    WHERE p.id = _parent_id AND p.status IN ('approved', 'hidden')
      AND CASE WHEN _target_type = 'movie'
        THEN p.anime_id = _anime_id AND p.episode_id IS NULL
        ELSE p.episode_id = _episode_id AND p.anime_id IS NULL END) THEN
    RAISE EXCEPTION 'Komentar yang dibalas tidak ditemukan.' USING ERRCODE = '22023';
  END IF;

  IF _client_token IS NULL THEN
    RAISE EXCEPTION 'Pengiriman komentar memerlukan token sesi untuk pembatasan.' USING ERRCODE = '22023';
  END IF;
  _key := 'tok:' || _client_token::text; -- spoofable secondary throttle, not identity

  DELETE FROM public.comment_rate_limits
  WHERE window_start < pg_catalog.now() - interval '1 day';

  -- Pseudonymous metadata only; never trusted identity or a rate-limit key.
  _ip := COALESCE(
    NULLIF(pg_catalog.btrim(pg_catalog.split_part(COALESCE(_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    NULLIF(pg_catalog.btrim(COALESCE(_headers ->> 'x-real-ip', '')), ''));
  IF _ip IS NOT NULL THEN
    _ip_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to('usaginime:' || _ip, 'UTF8')), 'hex');
  END IF;

  INSERT INTO public.comment_rate_limits AS r (throttle_key, window_start, hits)
  VALUES (_key, pg_catalog.now(), 1)
  ON CONFLICT (throttle_key) DO UPDATE SET
    hits = CASE WHEN r.window_start < pg_catalog.now() - interval '60 seconds' THEN 1 ELSE r.hits + 1 END,
    window_start = CASE WHEN r.window_start < pg_catalog.now() - interval '60 seconds' THEN pg_catalog.now() ELSE r.window_start END
  RETURNING hits INTO _hits;
  IF _hits > 3 THEN
    RAISE EXCEPTION 'Terlalu banyak komentar. Coba lagi sebentar lagi.' USING ERRCODE = '54000';
  END IF;

  -- Duplicate guard per (target type, target, content).
  _hash := pg_catalog.md5(pg_catalog.lower(_body));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(_target_type || ':' || _target::text || ':' || _hash));
  IF EXISTS (SELECT 1 FROM public.episode_comments AS d
    WHERE d.content_hash = _hash
      AND d.created_at > pg_catalog.now() - interval '5 minutes'
      AND CASE WHEN _target_type = 'movie' THEN d.anime_id = _anime_id ELSE d.episode_id = _episode_id END) THEN
    RAISE EXCEPTION 'Komentar yang sama baru saja dikirim.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.episode_comments (episode_id, anime_id, parent_id, author_name, email, content, ip_hash, content_hash)
  VALUES (
    CASE WHEN _target_type = 'episode' THEN _episode_id END,
    CASE WHEN _target_type = 'movie' THEN _anime_id END,
    _parent_id, COALESCE(_name, 'Anonim'), _mail, _body, _ip_hash, _hash)
  RETURNING episode_comments.id INTO _id;
  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_guest_comment(text, uuid, text, text, uuid, uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_comment(text, uuid, text, text, uuid, uuid, text, uuid, text) TO anon, authenticated;

COMMIT;
