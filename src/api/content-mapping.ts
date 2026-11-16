import type { Anime, Episode, SiteSettings, Tag } from './types';
import type { Database } from '@/integrations/supabase/db-types';

/** Row shapes matching the verified live database columns. */
export type AnimeRow = Database['public']['Tables']['anime']['Row'];
export type EpisodeRow = Database['public']['Tables']['episodes']['Row'];
export type SettingsRow = Pick<Database['public']['Tables']['site_settings']['Row'],
  'id' | 'site_name' | 'tagline' | 'logo_path' | 'footer_text' | 'updated_at'>;
export interface AnimeTagRow { anime_id: string; tag_id: string }
export function mapAnime(row: AnimeRow, links: AnimeTagRow[]): Anime {
  return {
    id: row.id, title: row.title, slug: row.slug,
    synopsis: row.synopsis ?? '', posterUrl: row.poster_path ?? '',
    ...(row.alt_title !== null ? { altTitle: row.alt_title } : {}),
    ...(row.studio !== null ? { studio: row.studio } : {}),
    rating: row.rating, durationMinutes: row.duration_minutes,
    totalEpisodes: row.total_episodes,
    type: row.type, status: row.status, season: row.season ?? '',
    year: row.year ?? 0, isPublished: row.is_published,
    tagIds: links.filter(link => link.anime_id === row.id).map(link => link.tag_id),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
export function mapEpisode(row: EpisodeRow): Episode {
  return { id: row.id, animeId: row.anime_id, number: row.number, title: row.title ?? '',
    embedUrl: row.embed_url ?? '', thumbnailUrl: row.thumbnail_path ?? '',
    isPublished: row.is_published, publishedAt: row.published_at ?? '', updatedAt: row.updated_at };
}
export function mapSettings(row: SettingsRow): SiteSettings {
  return { siteName: row.site_name, tagline: row.tagline ?? '', logoUrl: row.logo_path,
    footerText: row.footer_text ?? '' };
}
export type TagRow = Tag;
