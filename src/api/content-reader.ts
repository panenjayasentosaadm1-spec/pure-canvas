import { supabase } from '@/integrations/supabase/client';
import { mapAnime, mapEpisode, mapSettings, type AnimeRow, type AnimeTagRow, type EpisodeRow, type SettingsRow, type TagRow } from './content-mapping';
import type { AnimeFilter } from './anime';

const ANIME_COLUMNS = 'id,title,alt_title,slug,synopsis,poster_path,studio,rating,type,status,season,year,duration_minutes,total_episodes,is_published,created_at,updated_at';
const EPISODE_COLUMNS = 'id,anime_id,number,title,embed_url,thumbnail_path,is_published,published_at,created_at,updated_at';

/** Unwired migration checkpoint: uses existing RLS and never mock fallback. */
export async function readPublishedAnime(filter: AnimeFilter = {}) {
  const result = await supabase.from('anime').select(ANIME_COLUMNS).eq('is_published', true).order('title');
  if (result.error) throw new Error('Data anime gagal dimuat. Coba lagi.');
  const rows = result.data as unknown as AnimeRow[] | null;
  if (!rows?.length) return [];
  const links = await supabase.from('anime_tags').select('anime_id,tag_id').in('anime_id', rows.map(row => row.id));
  if (links.error) throw new Error('Genre anime gagal dimuat. Coba lagi.');
  const query = filter.query?.trim().toLowerCase();
  return rows.filter(row => row.is_published).map(row => mapAnime(row, (links.data ?? []) as AnimeTagRow[]))
    .filter(anime => (!query || anime.title.toLowerCase().includes(query))
      && (!filter.status || anime.status === filter.status)
      && (!filter.tagId || anime.tagIds.includes(filter.tagId)));
}

export async function readPublishedAnimeBySlug(slug: string) {
  // Keep lookup semantics identical to the existing API; a narrow database lookup
  // will replace this once the complete content API is switched together.
  return (await readPublishedAnime()).find(anime => anime.slug === slug) ?? null;
}

export async function readPublishedEpisodes(animeId: string) {
  // Explicit parent publication filter also protects signed-in admins: RLS may
  // legitimately allow them to read drafts, but public API projections must not.
  const parent = await supabase.from('anime').select('id,is_published').eq('id', animeId).eq('is_published', true).maybeSingle();
  if (parent.error) throw new Error('Data anime gagal dimuat. Coba lagi.');
  if (!parent.data?.is_published) return [];
  const result = await supabase.from('episodes').select(EPISODE_COLUMNS).eq('anime_id', animeId).eq('is_published', true).order('number');
  if (result.error) throw new Error('Episode gagal dimuat. Coba lagi.');
  return ((result.data ?? []) as unknown as EpisodeRow[])
    .filter(row => row.is_published && row.anime_id === animeId).map(mapEpisode);
}

export async function readTags() {
  const result = await supabase.from('tags').select('id,name,slug').order('name');
  if (result.error) throw new Error('Genre gagal dimuat. Coba lagi.');
  return (result.data ?? []) as TagRow[];
}

export async function readSiteSettings() {
  const result = await supabase.from('site_settings').select('id,site_name,tagline,logo_path,footer_text,updated_at').limit(1).maybeSingle();
  if (result.error) throw new Error('Pengaturan situs gagal dimuat. Coba lagi.');
  if (!result.data) throw new Error('Pengaturan situs belum tersedia.');
  return mapSettings(result.data as unknown as SettingsRow);
}