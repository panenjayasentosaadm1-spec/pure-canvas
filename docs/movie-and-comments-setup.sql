-- Stage 1: Anime Movie support + unified comments (episode | movie).
-- Manual incremental setup for the EXISTING external database. Run once in the SQL editor
-- AFTER docs/comments-setup.sql. Nothing in the app executes this file automatically.
-- Additive only: no rows are deleted or rewritten. Existing comments (approved, hidden,
-- pending, spam, and threaded replies) keep episode_id set and anime_id NULL, so they
-- satisfy the new target constraint as-is.
BEGIN;

-- 1. Movie video link on anime (nullable; kept even if type later changes to TV).
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS embed_url text;

-- 2. Comment target: exactly one of episode_id / anime_id.
ALTER TABLE public.episode_comments
  ADD COLUMN IF NOT EXISTS anime_id uuid REFERENCES public.anime(id) ON DELETE CASCADE;
ALTER TABLE public.episode_comments ALTER COLUMN episode_id DROP NOT NULL;
ALTER TABLE public.episode_comments DROP CONSTRAINT IF EXISTS episode_comments_target_check;
ALTER TABLE public.episode_comments ADD CONSTRAINT episode_comments_target_check
  CHECK ((episode_id IS NOT NULL AND anime_id IS NULL) OR (episode_id IS NULL AND anime_id IS NOT NULL));

-- 3. Indexes for movie reads and movie duplicate checks.
CREATE INDEX IF NOT EXISTS episode_comments_anime_idx
  ON public.episode_comments (anime_id, created_at) WHERE anime_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS episode_comments_movie_dupe_idx
  ON public.episode_comments (anime_id, content_hash, created_at) WHERE anime_id IS NOT NULL;

-- 4. Public column grant for the new column (raw content/email/ip stay ungranted).
GRANT SELECT (anime_id) ON public.episode_comments TO anon, authenticated;
-- RLS policies are status/role based and need no change.

-- 5. Public retrieval with explicit target type. SECURITY INVOKER; RLS applies.
CREATE OR REPLACE FUNCTION public.get_comments(_target_id uuid, _target_type text DEFAULT 'episode')
RETURNS TABLE (id uuid, parent_id uuid, author_name text, content text, is_hidden boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT c.id, c.parent_id, c.author_name,
    CASE WHEN c.status = 'hidden' THEN '[Komentar ini telah disembunyikan oleh moderator]' ELSE c.public_content END,
    c.status = 'hidden', c.created_at
  FROM public.episode_comments AS c
  WHERE c.status IN ('approved', 'hidden')
    AND CASE
      WHEN _target_type = 'movie' THEN c.anime_id = _target_id AND c.episode_id IS NULL
      WHEN _target_type = 'episode' THEN c.episode_id = _target_id AND c.anime_id IS NULL
      ELSE false
    END
  ORDER BY c.created_at ASC
  LIMIT 2000;
$$;
REVOKE ALL ON FUNCTION public.get_comments(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_comments(uuid, text) TO anon, authenticated;

-- Legacy wrapper kept so the current episode pages keep working unchanged.
CREATE OR REPLACE FUNCTION public.get_episode_comments(_episode_id uuid)
RETURNS TABLE (id uuid, parent_id uuid, author_name text, content text, is_hidden boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT * FROM public.get_comments(_episode_id, 'episode');
$$;
REVOKE ALL ON FUNCTION public.get_episode_comments(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_episode_comments(uuid) TO anon, authenticated;

-- 6. Guest submission. The old signature is replaced; PostgREST calls by parameter
-- name, so existing episode calls (no _anime_id/_target_type) keep working.
DROP FUNCTION IF EXISTS public.submit_guest_comment(uuid, text, text, text, uuid, uuid, text);
CREATE FUNCTION public.submit_guest_comment(
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

-- 7. Admin list: return type changes, so DROP + CREATE, then restore grants.
DROP FUNCTION IF EXISTS public.admin_list_comments();
CREATE FUNCTION public.admin_list_comments()
RETURNS TABLE (id uuid, episode_id uuid, parent_id uuid, author_name text, email text, content text,
  status text, created_at timestamptz, anime_id uuid, anime_title text, episode_number numeric,
  special_label text, target_type text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Akses admin diperlukan.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT c.id, c.episode_id, c.parent_id, c.author_name, c.email, c.content, c.status, c.created_at,
      a.id, a.title, e.number::numeric, e.special_label::text,
      CASE WHEN c.anime_id IS NOT NULL THEN 'movie' ELSE 'episode' END
    FROM public.episode_comments AS c
    LEFT JOIN public.episodes AS e ON e.id = c.episode_id
    JOIN public.anime AS a ON a.id = COALESCE(e.anime_id, c.anime_id)
    ORDER BY c.created_at DESC
    LIMIT 2000;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_comments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_comments() TO authenticated;

COMMIT;
