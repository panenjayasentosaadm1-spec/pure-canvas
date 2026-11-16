CREATE TYPE public.anime_type AS ENUM ('tv','movie','ova','ona','special');
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS type public.anime_type NOT NULL DEFAULT 'tv';
ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS thumbnail_url text;

CREATE POLICY "Public read thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Admins upload thumbnails" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'thumbnails' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update thumbnails" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'thumbnails' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete thumbnails" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'thumbnails' AND public.has_role(auth.uid(),'admin'));