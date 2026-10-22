
import { z } from "zod";
import type { Episode } from "./types";

export function videoLinkError(
  value: string,
  allowedDomains: string[] = [],
): string | undefined {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return "Link sumber video tidak valid.";
  }

  if (url.protocol !== "https:") {
    return "Link sumber video harus menggunakan HTTPS.";
  }

  if (url.username || url.password) {
    return "Link sumber video tidak boleh berisi nama pengguna atau kata sandi.";
  }

  const hostname = url.hostname.toLowerCase();
  const domains = Array.isArray(allowedDomains) ? allowedDomains : [];

  if (
    domains.length > 0 &&
    !domains.some((entry) => {
      const domain = entry.trim().toLowerCase();

      return (
        Boolean(domain) &&
        (hostname === domain || hostname.endsWith(`.${domain}`))
      );
    })
  ) {
    return "Domain sumber video tidak diizinkan. Pilih domain yang terdaftar.";
  }

  return undefined;
}

export const episodeInputSchema = z.object({
  animeId: z.string().min(1, "Pilih anime terlebih dahulu."),
  number: z
    .number()
    .int("Nomor episode harus bilangan bulat.")
    .positive("Nomor episode minimal 1."),
  title: z.string().trim(),
  embedUrl: z.string().trim().min(1, "Link sumber video wajib diisi."),
  thumbnailUrl: z.string().optional(),
  isPublished: z.boolean(),
});

export type EpisodeInput = z.infer<typeof episodeInputSchema>;

export function nextEpisodeNumber(
  episodes: Episode[],
  animeId: string,
): number {
  return (
    episodes.reduce(
      (latest, episode) =>
        episode.animeId === animeId
          ? Math.max(latest, episode.number)
          : latest,
      0,
    ) + 1
  );
}
