import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/db-types";
import { getEpisodeThumbnailUrl } from "./list-image";
import type { Episode, SpecialEpisodeLabel } from "./types";

type EpisodeRow = Database["public"]["Tables"]["episodes"]["Row"];

function mapEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    animeId: row.anime_id,
    number: row.number,
    specialLabel: row.special_label as SpecialEpisodeLabel | null,
    title: row.title ?? "",
    embedUrl: row.embed_url ?? "",
    thumbnailUrl: getEpisodeThumbnailUrl(row.thumbnail_path),
    isPublished: row.is_published,
    publishedAt: row.published_at ?? "",
    updatedAt: row.updated_at,
  };
}

/** Episode yang dipublikasikan untuk satu anime. */
export async function listEpisodesByAnime(
  animeId: string,
): Promise<Episode[]> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("anime_id", animeId)
    .eq("is_published", true)
    .order("number", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to load episodes: ${error.message}`);
  }

  return (data ?? []).map(mapEpisode);
}

/** Episode yang dipublikasikan untuk banyak anime sekaligus. */
export async function listEpisodesForAnimes(
  animeIds: string[],
): Promise<Episode[]> {
  if (animeIds.length === 0) return [];

  const chunks: string[][] = [];

  for (let i = 0; i < animeIds.length; i += 100) {
    chunks.push(animeIds.slice(i, i + 100));
  }

  const responses = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("episodes")
        .select("*")
        .eq("is_published", true)
        .in("anime_id", chunk)
        .order("number", { ascending: true, nullsFirst: false }),
    ),
  );

  const episodes: Episode[] = [];

  for (const { data, error } of responses) {
    if (error) {
      throw new Error(`Failed to load episodes: ${error.message}`);
    }

    episodes.push(...(data ?? []).map(mapEpisode));
  }

  return episodes.sort((a, b) => {
    if (a.animeId !== b.animeId) {
      return a.animeId.localeCompare(b.animeId);
    }

    if (a.number === null && b.number !== null) return 1;
    if (a.number !== null && b.number === null) return -1;
    if (a.number !== null && b.number !== null) {
      return a.number - b.number;
    }

    return a.publishedAt.localeCompare(b.publishedAt);
  });
}

/** Mengambil episode biasa berdasarkan nomor, termasuk EP 0. */
export async function getEpisode(
  animeId: string,
  number: number,
): Promise<Episode | null> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("anime_id", animeId)
    .eq("number", number)
    .is("special_label", null)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load episode: ${error.message}`);
  }

  return data ? mapEpisode(data) : null;
}

/** Mengambil episode khusus berdasarkan ID. */
export async function getSpecialEpisode(
  animeId: string,
  episodeId: string,
): Promise<Episode | null> {
  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("anime_id", animeId)
    .eq("id", episodeId)
    .not("special_label", "is", null)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load special episode: ${error.message}`);
  }

  return data ? mapEpisode(data) : null;
}
