
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/db-types";
import {
  episodeInputSchema,
  videoLinkError,
  type EpisodeInput,
} from "./episode-validation";
import { getEmbedDomains } from "./admin-site";
import type { Episode, SpecialEpisodeLabel } from "./types";
import { imageObjectPath } from "./storage-image";

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
    specialLabel: row.special_label as SpecialEpisodeLabel | null,
    title: row.title ?? "",
    embedUrl: row.embed_url ?? "",
    thumbnailUrl: getThumbnailUrl(row.thumbnail_path),
    isPublished: row.is_published,
    publishedAt: row.published_at ?? "",
    updatedAt: row.updated_at,
  };
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

  return imageObjectPath(THUMBNAIL_BUCKET, value);
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
  const episodeNumber =
    data.specialLabel === null ? data.number : null;

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

  if (episodeNumber !== null) {
    let duplicateQuery = supabase
      .from("episodes")
      .select("id")
      .eq("anime_id", data.animeId)
      .eq("number", episodeNumber);

    if (id) {
      duplicateQuery = duplicateQuery.neq("id", id);
    }

    const { data: duplicate, error: duplicateError } =
      await duplicateQuery.limit(1);

    if (duplicateError) {
      throw new Error(
        `Gagal memeriksa nomor episode: ${duplicateError.message}`,
      );
    }

    if (duplicate && duplicate.length > 0) {
      throw new Error("Nomor episode sudah digunakan untuk anime ini.");
    }
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
    number: episodeNumber,
    special_label: data.specialLabel ?? null,
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

export interface MassEpisodeProblem {
  lineNumber: number;
  message: string;
  host?: string;
}

export class MassEpisodeImportError extends Error {
  problems: MassEpisodeProblem[];

  constructor(problems: MassEpisodeProblem[]) {
    super("Tidak ada episode yang disimpan karena ada baris yang tidak valid.");
    this.problems = problems;
  }
}

export interface MassEpisodeInput {
  animeId: string;
  startNumber: number;
  lines: string[];
  publishDirectly: boolean;
  includeInLatest: boolean;
}

export async function createEpisodesBatch(
  input: MassEpisodeInput,
): Promise<number> {
  const { animeId, startNumber, lines, publishDirectly, includeInLatest } =
    input;

  if (!Number.isInteger(startNumber) || startNumber < 0) {
    throw new Error("Mulai dari nomor harus bilangan bulat 0 atau lebih.");
  }

  if (lines.length === 0) {
    throw new Error("Tidak ada link untuk diproses. Tempel minimal satu link.");
  }

  if (lines.length > 200) {
    throw new Error("Maksimal 200 link dalam satu kali impor.");
  }

  const { data: anime, error: animeError } = await supabase
    .from("anime")
    .select("id")
    .eq("id", animeId)
    .maybeSingle();

  if (animeError) {
    throw new Error(`Gagal memeriksa anime: ${animeError.message}`);
  }

  if (!anime) {
    throw new Error("Anime tidak ditemukan.");
  }

  const allowedDomains = await getEmbedDomains();

  const { data: existingNumbers, error: existingError } = await supabase
    .from("episodes")
    .select("number")
    .eq("anime_id", animeId);

  if (existingError) {
    throw new Error(`Gagal memeriksa nomor episode: ${existingError.message}`);
  }

  const takenNumbers = new Set(
    (existingNumbers ?? []).map((row) => row.number),
  );

  const problems: MassEpisodeProblem[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    const linkProblem = videoLinkError(line);
    if (linkProblem) {
      problems.push({ lineNumber, message: linkProblem });
      return;
    }

    let host = "";
    try {
      host = new URL(line).hostname.toLowerCase();
    } catch {
      host = "";
    }

    if (!host) {
      problems.push({ lineNumber, message: "Link sumber video tidak valid." });
      return;
    }

    const allowed = allowedDomains.some((domain) => {
      const normalized = domain.trim().toLowerCase();
      return (
        Boolean(normalized) &&
        (host === normalized || host.endsWith(`.${normalized}`))
      );
    });

    if (!allowed) {
      problems.push({
        lineNumber,
        message: `Domain ${host} tidak ada di daftar domain embed.`,
        host,
      });
    }

    const number = startNumber + index;
    if (takenNumbers.has(number)) {
      problems.push({
        lineNumber,
        message: `Nomor episode ${number} sudah digunakan untuk anime ini.`,
      });
    }
  });

  if (problems.length > 0) {
    throw new MassEpisodeImportError(problems);
  }

  const basePublishedAtMs = Date.UTC(2000, 0, 1);
  const now = new Date().toISOString();

  const rows = lines.map((embedUrl, index) => ({
    anime_id: animeId,
    number: startNumber + index,
    special_label: null,
    title: null,
    embed_url: embedUrl,
    thumbnail_path: null,
    is_published: publishDirectly,
    published_at: publishDirectly
      ? includeInLatest
        ? null
        : new Date(basePublishedAtMs + index * 60000).toISOString()
      : null,
    updated_at: now,
  }));

  const { error } = await supabase.from("episodes").insert(rows);

  if (error) {
    throw new Error(`Gagal menyimpan episode: ${error.message}`);
  }

  return lines.length;
}
