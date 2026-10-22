
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  episodeInputSchema,
  videoLinkError,
  type EpisodeInput,
} from "./episode-validation";
import type { Episode } from "./types";

type EpisodeRow = Database["public"]["Tables"]["episodes"]["Row"];

const THUMBNAIL_BUCKET = "thumbnails";
const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024;

function getThumbnailUrl(path: string | null): string | undefined {
  if (!path) return undefined;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return supabase.storage
    .from(THUMBNAIL_BUCKET)
    .getPublicUrl(path)
    .data.publicUrl;
}

function mapEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    animeId: row.anime_id,
    number: row.number,
    title: row.title ?? "",
    embedUrl: row.embed_url ?? "",
    thumbnailUrl: getThumbnailUrl(row.thumbnail_path),
    isPublished: row.is_published,
    publishedAt: row.published_at ?? "",
    updatedAt: row.updated_at,
  };
}

async function getAllowedEmbedDomains(): Promise<string[]> {
  const { data, error } = await supabase
    .from("allowed_embed_domains")
    .select("domain");

  if (error) {
    throw new Error(`Gagal memuat domain embed: ${error.message}`);
  }

  return (data ?? []).map((item) => item.domain);
}

async function uploadThumbnailIfNeeded(
  thumbnailUrl: string,
): Promise<string> {
  const match = thumbnailUrl.match(
    /^data:image\/(jpeg|png|webp);base64,/i,
  );

  if (!match) {
    throw new Error(
      "Format thumbnail tidak didukung. Gunakan gambar JPEG, PNG, atau WebP.",
    );
  }

  let blob: Blob;

  try {
    const response = await fetch(thumbnailUrl);
    if (!response.ok) {
      throw new Error("Gambar tidak dapat dibaca.");
    }
    blob = await response.blob();
  } catch {
    throw new Error(
      "Gambar thumbnail gagal diproses. Silakan unggah ulang gambar.",
    );
  }

  if (blob.size === 0) {
    throw new Error("Gambar thumbnail kosong. Silakan unggah ulang.");
  }

  if (blob.size > MAX_THUMBNAIL_SIZE) {
    throw new Error(
      "Ukuran thumbnail melebihi batas 2 MB. Gunakan gambar yang lebih kecil.",
    );
  }

  const mimeType = blob.type.toLowerCase();
  const extensionByMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensionByMime[mimeType];

  if (!extension) {
    throw new Error(
      "Format thumbnail tidak didukung. Gunakan gambar JPEG, PNG, atau WebP.",
    );
  }

  const path = `episodes/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(path, blob, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(
      `Gagal mengunggah thumbnail ke Supabase Storage: ${error.message}`,
    );
  }

  return path;
}

async function resolveThumbnailPath(
  thumbnailUrl: string | undefined,
  previousPath: string | null,
): Promise<string | null> {
  if (thumbnailUrl === undefined) {
    return previousPath;
  }

  const value = thumbnailUrl.trim();

  if (!value) {
    return null;
  }

  if (value.startsWith("data:")) {
    return uploadThumbnailIfNeeded(value);
  }

  // URL gambar eksternal tetap didukung.
  // URL Storage yang sudah tersimpan juga tetap dapat digunakan.
  return value;
}

export async function saveEpisode(
  input: EpisodeInput,
  id?: string,
): Promise<Episode> {
  const parsed = episodeInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Data episode tidak valid.",
    );
  }

  const data = parsed.data;

  const { data: anime, error: animeError } = await supabase
    .from("anime")
    .select("id")
    .eq("id", data.animeId)
    .maybeSingle();

  if (animeError) {
    throw new Error(`Gagal memeriksa anime: ${animeError.message}`);
  }

  if (!anime) {
    throw new Error("Anime tidak ditemukan.");
  }

  let previous: EpisodeRow | null = null;

  if (id) {
    const { data: existing, error } = await supabase
      .from("episodes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Gagal memeriksa episode: ${error.message}`);
    }

    if (!existing) {
      throw new Error("Episode tidak ditemukan.");
    }

    if (existing.anime_id !== data.animeId) {
      throw new Error("Anime episode tidak dapat diganti.");
    }

    previous = existing;
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("episodes")
    .select("id")
    .eq("anime_id", data.animeId)
    .eq("number", data.number)
    .neq("id", id ?? "00000000-0000-0000-0000-000000000000")
    .limit(1);

  if (duplicateError) {
    throw new Error(
      `Gagal memeriksa nomor episode: ${duplicateError.message}`,
    );
  }

  if (duplicate && duplicate.length > 0) {
    throw new Error("Nomor episode sudah digunakan untuk anime ini.");
  }

  const allowedDomains = await getAllowedEmbedDomains();
  const linkError = videoLinkError(data.embedUrl, allowedDomains);

  if (linkError) {
    throw new Error(linkError);
  }

  const thumbnailPath = await resolveThumbnailPath(
    data.thumbnailUrl,
    previous?.thumbnail_path ?? null,
  );

  const now = new Date().toISOString();
  const publishedAt =
    previous?.published_at ?? (data.isPublished ? now : null);

  const payload = {
    anime_id: data.animeId,
    number: data.number,
    title: data.title,
    embed_url: data.embedUrl,
    thumbnail_path: thumbnailPath,
    is_published: data.isPublished,
    published_at: publishedAt,
    updated_at: now,
  };

  if (id) {
    const { data: saved, error } = await supabase
      .from("episodes")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Gagal memperbarui episode: ${error.message}`);
    }

    return mapEpisode(saved);
  }

  const { data: saved, error } = await supabase
    .from("episodes")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Gagal menyimpan episode: ${error.message}`);
  }

  return mapEpisode(saved);
}

export async function deleteEpisode(id: string): Promise<void> {
  const { error } = await supabase
    .from("episodes")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Gagal menghapus episode: ${error.message}`);
  }
}
