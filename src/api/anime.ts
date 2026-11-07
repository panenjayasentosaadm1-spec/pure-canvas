import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/db-types";
import type { Anime, AnimeStatus } from "./types";
import { posterDisplayUrl } from "./storage-image";

export interface AnimeFilter {
  query?: string | undefined;
  status?: AnimeStatus | undefined;
  tagId?: string | undefined;
}

type AnimeRow = Database["public"]["Tables"]["anime"]["Row"];

type AnimeTagRow = {
  anime_id: string;
  tag_id: string;
};

async function getTagIdsByAnime(
  animeIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();

  for (const id of animeIds) {
    result.set(id, []);
  }

  if (animeIds.length === 0) return result;

  const { data, error } = await supabase
    .from("anime_tags")
    .select("anime_id, tag_id")
    .in("anime_id", animeIds);

  if (error) {
    throw new Error(`Failed to load anime genres: ${error.message}`);
  }

  for (const row of (data ?? []) as AnimeTagRow[]) {
    const tags = result.get(row.anime_id);
    if (tags && !tags.includes(row.tag_id)) {
      tags.push(row.tag_id);
    }
  }

  return result;
}

async function mapAnime(
  row: AnimeRow,
  tagIds: string[] = [],
): Promise<Anime> {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    synopsis: row.synopsis ?? "",
    posterUrl: await posterDisplayUrl(row.poster_path),
    ...(row.alt_title !== null ? { altTitle: row.alt_title } : {}),
    ...(row.studio !== null ? { studio: row.studio } : {}),
    rating: row.rating,
    durationMinutes: row.duration_minutes,
    totalEpisodes: row.total_episodes,
    status: row.status,
    type: row.type,
    season: row.season ?? "",
    year: row.year ?? 0,
    isPublished: row.is_published,
    tagIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

  };
}

async function mapAnimeRows(rows: AnimeRow[]): Promise<Anime[]> {
  const tagIdsByAnime = await getTagIdsByAnime(
    rows.map((row) => row.id),
  );

  return Promise.all(
    rows.map((row) => mapAnime(row, tagIdsByAnime.get(row.id) ?? [])),
  );
}

export async function listAnime(
  filter: AnimeFilter = {},
): Promise<Anime[]> {
  let request = supabase
    .from("anime")
    .select("*")
    .eq("is_published", true);

  if (filter.status) {
    request = request.eq("status", filter.status);
  }

  if (filter.query?.trim()) {
    const query = filter.query.trim().replace(/[,%()]/g, "");
    if (query) {
      request = request.ilike("title", `%${query}%`);
    }
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(`Failed to load anime: ${error.message}`);
  }

  let result = await mapAnimeRows(data ?? []);

  const tagId = filter.tagId;
  if (tagId) {
    result = result.filter((anime) => anime.tagIds.includes(tagId));
  }

  return result.sort((a, b) => a.title.localeCompare(b.title));
}

let sharedListAnime: Promise<Anime[]> | null = null;

/**
 * listAnime() tanpa filter dengan dedupe hanya untuk permintaan bersamaan:
 * beberapa query yang berjalan paralel memakai satu permintaan jaringan.
 * Promise dibuang setelah selesai, jadi tidak ada data basi yang tersimpan
 * dan invalidasi setelah update admin tetap berlaku.
 */
export function listAnimeShared(): Promise<Anime[]> {
  sharedListAnime ??= listAnime().finally(() => {
    sharedListAnime = null;
  });
  return sharedListAnime;
}

export async function listLatestAnime(
  limit = 10,
): Promise<Anime[]> {
  const safeLimit = Math.max(0, Math.floor(limit));
  if (safeLimit === 0) return [];

  const { data, error } = await supabase
    .from("anime")
    .select("*")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new Error(`Failed to load latest anime: ${error.message}`);
  }

  return mapAnimeRows(data ?? []);
}

export async function getAnimeBySlug(
  slug: string,
): Promise<Anime | null> {
  const { data, error } = await supabase
    .from("anime")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load anime details: ${error.message}`);
  }

  if (!data) return null;

  const [anime] = await mapAnimeRows([data]);
  return anime ?? null;
}
