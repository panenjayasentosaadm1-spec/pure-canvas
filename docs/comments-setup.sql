-- Manual incremental setup for the EXISTING external database only.
-- Guest comments for episode pages + admin moderation. Run once in the SQL editor.
-- Nothing in the app executes this file automatically.
--
-- Security model
--   * anon/authenticated may SELECT only public columns (never email, ip_hash, raw content).
--   * Raw `content` is never granted; `public_content` is maintained by a trigger and is
--     NULL for hidden comments, so hidden text cannot be read through any API path.
--   * RLS exposes only approved/hidden rows publicly; pending/spam rows are invisible.
--   * Guests write only through submit_guest_comment (SECURITY DEFINER, fixed search_path).
--   * Admins read private fields only through admin_list_comments (role-checked), and
--     hide/unhide/delete through table privileges gated by has_role() RLS policies.
--
-- IP limitation: Supabase documents reading x-forwarded-for from request.headers, but
-- does not document that hosted Kong sanitizes or safely appends it for direct browser
-- requests. x-forwarded-for and x-real-ip are therefore NOT trusted as identity or used
-- for rate limiting here. If present, the header value is stored only as a fixed-prefix
-- SHA-256 hash for comment metadata; this is pseudonymization, not guaranteed
-- anonymization, and the value may be client-controlled. Rate limiting relies on the
-- browser session token, which is spoofable and can be rotated; honeypot and duplicate
-- checks are additional, not equivalent limits. If _client_token is unavailable,
-- submissions are rejected rather than silently accepted without a rate limit.
BEGIN;

CREATE TABLE IF NOT EXISTS public.episode_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.episode_comments(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'Anonim' CHECK (char_length(author_name) BETWEEN 1 AND 50),
  email text CHECK (email IS NULL OR (char_length(email) <= 254 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 2 AND 1000),
  public_content text,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'hidden', 'pending', 'spam')),
  ip_hash text,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS episode_comments_episode_idx ON public.episode_comments (episode_id, created_at);
CREATE INDEX IF NOT EXISTS episode_comments_parent_idx ON public.episode_comments (parent_id);
CREATE INDEX IF NOT EXISTS episode_comments_dupe_idx ON public.episode_comments (episode_id, content_hash, created_at);

CREATE TABLE IF NOT EXISTS public.comment_rate_limits (
  throttle_key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  hits integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS comment_rate_limits_window_start_idx
  ON public.comment_rate_limits (window_start);

-- Keep public_content in sync; hidden/pending/spam text is never exposed.
CREATE OR REPLACE FUNCTION public.episode_comments_sync()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.public_content := CASE WHEN NEW.status = 'approved' THEN NEW.content ELSE NULL END;
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS episode_comments_sync ON public.episode_comments;
CREATE TRIGGER episode_comments_sync BEFORE INSERT OR UPDATE ON public.episode_comments
  FOR EACH ROW EXECUTE FUNCTION public.episode_comments_sync();

-- Grants (column-level for public reads; no INSERT for anyone but the definer function).
REVOKE ALL ON public.episode_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, episode_id, parent_id, author_name, public_content, status, created_at)
  ON public.episode_comments TO anon, authenticated;
GRANT UPDATE (status) ON public.episode_comments TO authenticated;
GRANT DELETE ON public.episode_comments TO authenticated;
GRANT ALL ON public.episode_comments TO service_role;

REVOKE ALL ON public.comment_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.comment_rate_limits TO service_role;

ALTER TABLE public.episode_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_rate_limits ENABLE ROW LEVEL SECURITY; -- no policies: no API access

DROP POLICY IF EXISTS "Public read visible comments" ON public.episode_comments;
CREATE POLICY "Public read visible comments" ON public.episode_comments
  FOR SELECT TO anon, authenticated USING (status IN ('approved', 'hidden'));
DROP POLICY IF EXISTS "Admin read comments" ON public.episode_comments;
CREATE POLICY "Admin read comments" ON public.episode_comments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admin moderate comments" ON public.episode_comments;
CREATE POLICY "Admin moderate comments" ON public.episode_comments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND status IN ('approved', 'hidden'));
DROP POLICY IF EXISTS "Admin delete comments" ON public.episode_comments;
CREATE POLICY "Admin delete comments" ON public.episode_comments
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Public retrieval: SECURITY INVOKER, reads only granted columns, RLS applies.
CREATE OR REPLACE FUNCTION public.get_episode_comments(_episode_id uuid)
RETURNS TABLE (id uuid, parent_id uuid, author_name text, content text, is_hidden boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT c.id, c.parent_id, c.author_name,
    CASE WHEN c.status = 'hidden' THEN '[Komentar ini telah disembunyikan oleh moderator]' ELSE c.public_content END,
    c.status = 'hidden', c.created_at
  FROM public.episode_comments AS c
  WHERE c.episode_id = _episode_id AND c.status IN ('approved', 'hidden')
  ORDER BY c.created_at ASC
  LIMIT 2000;
$$;
REVOKE ALL ON FUNCTION public.get_episode_comments(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_episode_comments(uuid) TO anon, authenticated;

-- Guest submission.
CREATE OR REPLACE FUNCTION public.submit_guest_comment(
  _episode_id uuid, _content text, _author_name text DEFAULT NULL, _email text DEFAULT NULL,
  _parent_id uuid DEFAULT NULL, _client_token uuid DEFAULT NULL, _honeypot text DEFAULT NULL)
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
  _hash text;
  _id uuid;
BEGIN
  IF COALESCE(_honeypot, '') <> '' THEN
    RAISE EXCEPTION 'Komentar ditolak.' USING ERRCODE = '22023';
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
  IF NOT EXISTS (SELECT 1 FROM public.episodes AS e WHERE e.id = _episode_id AND e.is_published) THEN
    RAISE EXCEPTION 'Episode tidak ditemukan.' USING ERRCODE = '22023';
  END IF;
  IF _parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.episode_comments AS p
    WHERE p.id = _parent_id AND p.episode_id = _episode_id AND p.status IN ('approved', 'hidden')) THEN
    RAISE EXCEPTION 'Komentar yang dibalas tidak ditemukan.' USING ERRCODE = '22023';
  END IF;

  IF _client_token IS NULL THEN
    RAISE EXCEPTION 'Pengiriman komentar memerlukan token sesi untuk pembatasan.' USING ERRCODE = '22023';
  END IF;
  _key := 'tok:' || _client_token::text; -- spoofable secondary throttle, not identity

  -- Do not derive identity from forwarded headers: Supabase does not document that
  -- direct browser-supplied values are sanitized or safely appended by its gateway.
  -- Opportunistically prune only keys inactive for a day; active 60-second windows
  -- are retained. This requires no scheduled job and limits token-rotation growth.
  DELETE FROM public.comment_rate_limits
  WHERE window_start < pg_catalog.now() - interval '1 day';

  -- Preserve the existing pseudonymous metadata only; this header is not verified and
  -- never becomes a rate-limit key or trusted client identity.
  _ip := COALESCE(
    NULLIF(pg_catalog.btrim(pg_catalog.split_part(COALESCE(_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    NULLIF(pg_catalog.btrim(COALESCE(_headers ->> 'x-real-ip', '')), ''));
  IF _ip IS NOT NULL THEN
    _ip_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to('usaginime:' || _ip, 'UTF8')), 'hex');
  END IF;

  -- Atomic throttle: the upsert takes a row lock, so concurrent requests serialize.
  IF _key IS NOT NULL THEN
    INSERT INTO public.comment_rate_limits AS r (throttle_key, window_start, hits)
    VALUES (_key, pg_catalog.now(), 1)
    ON CONFLICT (throttle_key) DO UPDATE SET
      hits = CASE WHEN r.window_start < pg_catalog.now() - interval '60 seconds' THEN 1 ELSE r.hits + 1 END,
      window_start = CASE WHEN r.window_start < pg_catalog.now() - interval '60 seconds' THEN pg_catalog.now() ELSE r.window_start END
    RETURNING hits INTO _hits;
    IF _hits > 3 THEN
      RAISE EXCEPTION 'Terlalu banyak komentar. Coba lagi sebentar lagi.' USING ERRCODE = '54000';
    END IF;
  END IF;

  -- Exact duplicate guard, serialized per (episode, content) with an advisory lock.
  _hash := pg_catalog.md5(pg_catalog.lower(_body));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(_episode_id::text || ':' || _hash));
  IF EXISTS (SELECT 1 FROM public.episode_comments AS d
    WHERE d.episode_id = _episode_id AND d.content_hash = _hash
      AND d.created_at > pg_catalog.now() - interval '5 minutes') THEN
    RAISE EXCEPTION 'Komentar yang sama baru saja dikirim.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.episode_comments (episode_id, parent_id, author_name, email, content, ip_hash, content_hash)
  VALUES (_episode_id, _parent_id, COALESCE(_name, 'Anonim'), _mail, _body, _ip_hash, _hash)
  RETURNING episode_comments.id INTO _id;
  RETURN _id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_guest_comment(uuid, text, text, text, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_comment(uuid, text, text, text, uuid, uuid, text) TO anon, authenticated;

-- Admin list with private fields (email); role-checked, never available to guests.
CREATE OR REPLACE FUNCTION public.admin_list_comments()
RETURNS TABLE (id uuid, episode_id uuid, parent_id uuid, author_name text, email text, content text,
  status text, created_at timestamptz, anime_id uuid, anime_title text, episode_number numeric, special_label text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Akses admin diperlukan.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT c.id, c.episode_id, c.parent_id, c.author_name, c.email, c.content, c.status, c.created_at,
      a.id, a.title, e.number::numeric, e.special_label::text
    FROM public.episode_comments AS c
    JOIN public.episodes AS e ON e.id = c.episode_id
    JOIN public.anime AS a ON a.id = e.anime_id
    ORDER BY c.created_at DESC
    LIMIT 2000;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_comments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_comments() TO authenticated;

COMMIT;
