
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
 * Ambil gambar kartu anime dari thumbnail episode terbaru yang dipublikasikan.
 * Jika tidak ada thumbnail, gunakan poster anime.
 */
export async function getListImageAsync(
  anime: Pick<Anime, "id" | "posterUrl">,
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from("episodes")
    .select("thumbnail_path, published_at, updated_at")
    .eq("anime_id", anime.id)
    .eq("is_published", true)
    .not("thumbnail_path", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Gagal memuat thumbnail episode:", error.message);
    return anime.posterUrl || undefined;
  }

  const path = data?.thumbnail_path;

  if (!path) {
    return anime.posterUrl || undefined;
  }

  return getEpisodeThumbnailUrl(path);
}

/**
 * Ubah path thumbnail episode (path objek Storage atau URL penuh)
 * menjadi URL gambar yang bisa dirender.
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
