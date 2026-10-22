
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { animeInputSchema, slugify } from "./admin-validation";
import type { AnimeInput } from "./admin-validation";
import type { Anime, Episode, SiteSettings, Tag } from "./types";

type AnimeRow = Database["public"]["Tables"]["anime"]["Row"];
type EpisodeRow = Database["public"]["Tables"]["episodes"]["Row"];
type TagRow = Database["public"]["Tables"]["tags"]["Row"];
type SettingsRow = Database["public"]["Tables"]["site_settings"]["Row"];

function getPublicUrl(
  bucket: string,
  path: string | null | undefined,
): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function mapAnime(row: AnimeRow, tagIds: string[] = []): Anime {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    altTitle: row.alt_title ?? undefined,
    studio: row.studio ?? undefined,
    rating: row.rating == null ? undefined : Number(row.rating),
    durationMinutes: row.duration_minutes ?? undefined,
    totalEpisodes: row.total_episodes ?? undefined,
    synopsis: row.synopsis ?? "",
    posterUrl: getPublicUrl("posters", row.poster_path),
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

function mapEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    animeId: row.anime_id,
    number: row.number,
    title: row.title ?? "",
    embedUrl: row.embed_url ?? "",
    thumbnailUrl: row.thumbnail_path
      ? getPublicUrl("thumbnails", row.thumbnail_path)
      : undefined,
    isPublished: row.is_published,
    publishedAt: row.published_at ?? "",
    updatedAt: row.updated_at,
  };
}

function mapTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, slug: row.slug };
}

function mapSettings(row: SettingsRow): SiteSettings {
  return {
    siteName: row.site_name,
    tagline: row.tagline ?? "",
    logoUrl: row.logo_path
      ? getPublicUrl("site", row.logo_path)
      : null,
    footerText: row.footer_text ?? "",
  };
}

/**
 * Mengunggah poster baru ke Supabase Storage.
 * Mengembalikan path file yang disimpan ke database.
 */
async function uploadPosterIfNeeded(
  posterUrl: string | null | undefined,
): Promise<string | null> {
  if (!posterUrl) return null;

  // Poster lama atau URL gambar yang sudah tersedia.
  if (!posterUrl.startsWith("data:image/")) {
    try {
      const url = new URL(posterUrl);
      const marker = "/storage/v1/object/public/posters/";
      const index = url.pathname.indexOf(marker);

      if (index !== -1) {
        return decodeURIComponent(
          url.pathname.slice(index + marker.length),
        );
      }
    } catch {
      throw new Error("URL poster tidak valid.");
    }

    return posterUrl;
  }

  // Ubah gambar Base64 dari form menjadi file.
  let blob: Blob;

  try {
    const response = await fetch(posterUrl);

    if (!response.ok) {
      throw new Error("Gambar tidak dapat dibaca.");
    }

    blob = await response.blob();
  } catch {
    throw new Error("Gambar poster gagal diproses.");
  }

  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensions[blob.type];

  if (!extension) {
    throw new Error("Format poster harus JPEG, PNG, atau WebP.");
  }

  if (blob.size > 2 * 1024 * 1024) {
    throw new Error("Ukuran poster maksimal 2 MB.");
  }

  const path = `anime/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("posters")
    .upload(path, blob, {
      contentType: blob.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Gagal mengunggah poster: ${error.message}`);
  }

  return path;
}

async function getTagIdsByAnime(
  animeIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>(
    animeIds.map((id) => [id, []]),
  );

  if (animeIds.length === 0) return result;

  const { data, error } = await supabase
    .from("anime_tags")
    .select("anime_id, tag_id")
    .in("anime_id", animeIds);

  if (error) {
    throw new Error(`Gagal memuat genre anime: ${error.message}`);
  }

  for (const row of data ?? []) {
    result.get(row.anime_id)?.push(row.tag_id);
  }

  return result;
}

export async function getAdminCounts() {
  const [
    animeResult,
    episodeResult,
    draftAnimeResult,
    draftEpisodeResult,
  ] = await Promise.all([
    supabase.from("anime").select("id", {
      count: "exact",
      head: true,
    }),
    supabase.from("episodes").select("id", {
      count: "exact",
      head: true,
    }),
    supabase.from("anime").select("id", {
      count: "exact",
      head: true,
    }).eq("is_published", false),
    supabase.from("episodes").select("id", {
      count: "exact",
      head: true,
    }).eq("is_published", false),
  ]);

  const error =
    animeResult.error ??
    episodeResult.error ??
    draftAnimeResult.error ??
    draftEpisodeResult.error;

  if (error) {
    throw new Error(`Gagal memuat statistik admin: ${error.message}`);
  }

  return {
    anime: animeResult.count ?? 0,
    episodes: episodeResult.count ?? 0,
    drafts:
      (draftAnimeResult.count ?? 0) +
      (draftEpisodeResult.count ?? 0),
  };
}

export async function getAdminSnapshot() {
  const [
    animeResult,
    episodeResult,
    tagResult,
    settingsResult,
    domainResult,
  ] = await Promise.all([
    supabase.from("anime").select("*").order("title"),
    supabase.from("episodes").select("*").order("number"),
    supabase.from("tags").select("*").order("name"),
    supabase.from("site_settings").select("*")
      .eq("id", 1).maybeSingle(),
    supabase.from("allowed_embed_domains").select("domain").order("domain"),
  ]);

  const error =
    animeResult.error ??
    episodeResult.error ??
    tagResult.error ??
    settingsResult.error ??
    domainResult.error;

  if (error) {
    throw new Error(`Gagal memuat data admin: ${error.message}`);
  }

  const animeRows = animeResult.data ?? [];
  const tagIdsByAnime = await getTagIdsByAnime(
    animeRows.map((item) => item.id),
  );

  const settings = settingsResult.data
    ? mapSettings(settingsResult.data)
    : {
        siteName: "UsagiNime",
        tagline: "",
        logoUrl: null,
        footerText: "",
      };

  return {
    anime: animeRows.map((item) =>
      mapAnime(item, tagIdsByAnime.get(item.id) ?? []),
    ),
    episodes: (episodeResult.data ?? []).map(mapEpisode),
    tags: (tagResult.data ?? []).map(mapTag),
    settings,
    allowedEmbedDomains: (domainResult.data ?? []).map(
      (item) => item.domain,
    ),
  };
}

export async function saveAnime(
  input: AnimeInput,
  id?: string,
): Promise<Anime> {
  const parsed = animeInputSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Data anime tidak valid.",
    );
  }

  const data = parsed.data;

  const { data: existing, error: existingError } = id
    ? await supabase
        .from("anime")
        .select("id, created_at")
        .eq("id", id)
        .maybeSingle()
    : { data: null, error: null };

  if (existingError) {
    throw new Error(`Gagal memeriksa anime: ${existingError.message}`);
  }

  if (id && !existing) {
    throw new Error("Anime tidak ditemukan.");
  }

  let duplicateQuery = supabase
    .from("anime")
    .select("id")
    .eq("slug", data.slug);

  if (id) {
    duplicateQuery = duplicateQuery.neq("id", id);
  }

  const { data: duplicate, error: duplicateError } =
    await duplicateQuery.maybeSingle();

  if (duplicateError) {
    throw new Error(`Gagal memeriksa slug: ${duplicateError.message}`);
  }

  if (duplicate) {
    throw new Error("Slug sudah digunakan anime lain.");
  }

  if (data.tagIds.length > 0) {
    const { data: validTags, error: tagError } = await supabase
      .from("tags")
      .select("id")
      .in("id", data.tagIds);

    if (tagError) {
      throw new Error(`Gagal memeriksa genre: ${tagError.message}`);
    }

    if ((validTags ?? []).length !== new Set(data.tagIds).size) {
      throw new Error("Genre tidak ditemukan.");
    }
  }

  // Unggah poster baru jika form mengirim gambar Base64.
  const posterPath = await uploadPosterIfNeeded(data.posterUrl);

  const payload = {
    title: data.title,
    slug: data.slug || slugify(data.title),
    alt_title: data.altTitle || null,
    studio: data.studio || null,
    rating: data.rating ?? null,
    duration_minutes: data.durationMinutes ?? null,
    total_episodes: data.totalEpisodes ?? null,
    synopsis: data.synopsis,
    poster_path: posterPath,
    status: data.status,
    type: data.type,
    season: data.season || null,
    year: data.year,
    is_published: data.isPublished,
    updated_at: new Date().toISOString(),
  };

  const { data: savedRow, error: saveError } = id
    ? await supabase
        .from("anime")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()
    : await supabase
        .from("anime")
        .insert(payload)
        .select("*")
        .single();

  if (saveError) {
    throw new Error(`Gagal menyimpan anime: ${saveError.message}`);
  }

  const { error: removeTagsError } = await supabase
    .from("anime_tags")
    .delete()
    .eq("anime_id", savedRow.id);

  if (removeTagsError) {
    throw new Error(
      `Anime tersimpan, tetapi genre lama gagal diperbarui: ${removeTagsError.message}`,
    );
  }

  if (data.tagIds.length > 0) {
    const { error: insertTagsError } = await supabase
      .from("anime_tags")
      .insert(
        [...new Set(data.tagIds)].map((tagId) => ({
          anime_id: savedRow.id,
          tag_id: tagId,
        })),
      );

    if (insertTagsError) {
      throw new Error(
        `Anime tersimpan, tetapi genre gagal disimpan: ${insertTagsError.message}`,
      );
    }
  }

  return mapAnime(savedRow, [...new Set(data.tagIds)]);
}

export async function setAnimePublished(
  id: string,
  isPublished: boolean,
): Promise<void> {
  const { data, error } = await supabase
    .from("anime")
    .update({
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal mengubah status publikasi: ${error.message}`);
  }

  if (!data) throw new Error("Anime tidak ditemukan.");
}

export async function deleteAnime(id: string): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from("anime")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Gagal memeriksa anime: ${lookupError.message}`);
  }

  if (!existing) throw new Error("Anime tidak ditemukan.");

  const { error: episodeError } = await supabase
    .from("episodes")
    .delete()
    .eq("anime_id", id);

  if (episodeError) {
    throw new Error(`Gagal menghapus episode anime: ${episodeError.message}`);
  }

  const { error: tagsError } = await supabase
    .from("anime_tags")
    .delete()
    .eq("anime_id", id);

  if (tagsError) {
    throw new Error(`Gagal menghapus relasi genre: ${tagsError.message}`);
  }

  const { error: animeError } = await supabase
    .from("anime")
    .delete()
    .eq("id", id);

  if (animeError) {
    throw new Error(`Gagal menghapus anime: ${animeError.message}`);
  }
}

export async function createTag(name: string): Promise<Tag> {
  const trimmed = name.trim();
  const slug = slugify(trimmed);

  if (!trimmed || !slug) {
    throw new Error("Nama genre wajib berisi huruf atau angka.");
  }

  const { data: existing, error: lookupError } = await supabase
    .from("tags")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Gagal memeriksa genre: ${lookupError.message}`);
  }

  if (existing) throw new Error("Genre sudah tersedia.");

  const { data, error } = await supabase
    .from("tags")
    .insert({ name: trimmed, slug })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Gagal membuat genre: ${error.message}`);
  }

  return mapTag(data);
}
