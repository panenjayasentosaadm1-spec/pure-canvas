CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.anime_status AS ENUM ('ongoing','completed','upcoming');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.anime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  synopsis text,
  poster_url text,
  status public.anime_status NOT NULL DEFAULT 'upcoming',
  season text,
  year integer,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.anime TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anime TO authenticated;
GRANT ALL ON public.anime TO service_role;
ALTER TABLE public.anime ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published anime" ON public.anime FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert anime" ON public.anime FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update anime" ON public.anime FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete anime" ON public.anime FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER anime_updated_at BEFORE UPDATE ON public.anime FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id uuid NOT NULL REFERENCES public.anime(id) ON DELETE CASCADE,
  episode_number integer NOT NULL,
  title text,
  embed_url text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (anime_id, episode_number)
);
CREATE INDEX episodes_anime_id_idx ON public.episodes(anime_id);
GRANT SELECT ON public.episodes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episodes TO authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published episodes" ON public.episodes FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert episodes" ON public.episodes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update episodes" ON public.episodes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete episodes" ON public.episodes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER episodes_updated_at BEFORE UPDATE ON public.episodes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tags" ON public.tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write tags" ON public.tags FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.anime_tags (
  anime_id uuid NOT NULL REFERENCES public.anime(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (anime_id, tag_id)
);
GRANT SELECT ON public.anime_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anime_tags TO authenticated;
GRANT ALL ON public.anime_tags TO service_role;
ALTER TABLE public.anime_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read anime_tags" ON public.anime_tags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write anime_tags" ON public.anime_tags FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.site_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name text NOT NULL DEFAULT 'UsagiNime',
  tagline text,
  logo_url text,
  footer_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.allowed_embed_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allowed_embed_domains TO authenticated;
GRANT ALL ON public.allowed_embed_domains TO service_role;
ALTER TABLE public.allowed_embed_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage embed domains" ON public.allowed_embed_domains FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER embed_domains_updated_at BEFORE UPDATE ON public.allowed_embed_domains FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.tags (name, slug) VALUES
 ('Action','action'),('Romance','romance'),('Comedy','comedy'),('Fantasy','fantasy'),('Slice of Life','slice-of-life');
INSERT INTO public.site_settings (id, site_name, tagline, footer_text) VALUES
 (1,'UsagiNime','Your cozy corner for anime episodes','© UsagiNime. All videos are embedded from third-party sources; we do not host any files.');

CREATE POLICY "Public read posters" ON storage.objects FOR SELECT USING (bucket_id = 'posters');
CREATE POLICY "Admins upload posters" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'posters' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update posters" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'posters' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete posters" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'posters' AND public.has_role(auth.uid(),'admin'));