import { supabase } from "@/integrations/supabase/client";
import type { Anime } from "./types";

/**
 * Fallback sinkron untuk komponen yang belum memakai data episode Supabase.
 */
export function getListImage(
  anime: Pick<Anime, "id" | "posterUrl">,
): string | undefined {
  return anime.posterUrl || undefined;
}

/**
 * Ambil thumbnail episode terbaru yang dipublikasikan.
 * Jika tidak ada thumbnail, gunakan poster anime.
 */
export async function getListImageAsync(
  anime: Pick<Anime, "id" | "posterUrl">,
): Promise<string | undefined> {
  const thumbnails = await getLatestThumbnailsByAnime([anime.id]);
  return thumbnails.get(anime.id) || anime.posterUrl || undefined;
}

/**
 * Thumbnail episode terbaru untuk banyak anime dalam satu permintaan
 * (menggantikan satu permintaan per anime pada daftar kartu).
 * Anime tanpa thumbnail tidak ada di hasil map.
 */
export async function getLatestThumbnailsByAnime(
  animeIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (animeIds.length === 0) return result;

  const chunks: string[][] = [];
  for (let i = 0; i < animeIds.length; i += 100) {
    chunks.push(animeIds.slice(i, i + 100));
  }

  const responses = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("episodes")
        .select("anime_id, thumbnail_path, published_at, updated_at")
        .eq("is_published", true)
        .not("thumbnail_path", "is", null)
        .in("anime_id", chunk)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false }),
    ),
  );

  for (const { data, error } of responses) {
    if (error) {
      console.error("Gagal memuat thumbnail episode:", error.message);
      continue;
    }
    for (const row of data ?? []) {
      if (result.has(row.anime_id) || !row.thumbnail_path) continue;
      result.set(row.anime_id, getEpisodeThumbnailUrl(row.thumbnail_path) ?? "");
    }
  }

  return result;
}

/**
 * Ubah path thumbnail episode atau URL penuh menjadi URL gambar.
 */
export function getEpisodeThumbnailUrl(
  path: string | null | undefined,
): string | undefined {
  if (!path) return undefined;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl;
}
