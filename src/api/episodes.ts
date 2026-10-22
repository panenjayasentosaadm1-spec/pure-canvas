
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { getEpisodeThumbnailUrl } from "./list-image";
import type { Episode } from "./types";

type EpisodeRow = Database["public"]["Tables"]["episodes"]["Row"];

/**
 * Convert a database row into the Episode shape used by the UI.
 */
function mapEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    animeId: row.anime_id,
    number: row.number,
    title: row.title ?? "",
    embedUrl: row.embed_url ?? "",
    thumbnailUrl: getEpisodeThumbnailUrl(row.thumbnail_path),
    isPublished: row.is_published,
    publishedAt: row.published_at ?? "",
    updatedAt: row.updated_at,
  };
}

/** Published episodes of one anime, ordered by episode number. */
export async function listEpisodesByAnime(
  animeId: string,
): Promise<Episode[]> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("anime_id", animeId)
    .eq("is_published", true)
    .order("number", { ascending: true });

  if (error) {
    throw new Error(`Failed to load episodes: ${error.message}`);
  }

  return (data ?? []).map(mapEpisode);
}

export async function getEpisode(
  animeId: string,
  number: number,
): Promise<Episode | null> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("anime_id", animeId)
    .eq("number", number)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load episode: ${error.message}`);
  }

  return data ? mapEpisode(data) : null;
}
