import { z } from "zod";
import type { Episode, SpecialEpisodeLabel } from "./types";
import { videoSourceError } from "@/lib/source-resolver";

export function videoLinkError(value: string): string | undefined {
  if (!value.trim()) return "Link sumber video wajib diisi.";

  const reason = videoSourceError(value);

  if (reason === "not-https") {
    return "Link sumber video harus menggunakan HTTPS.";
  }

  if (reason === "credentials") {
    return "Link sumber video tidak boleh berisi nama pengguna atau kata sandi.";
  }

  if (reason === "placeholder") {
    return "Gunakan link sumber video asli, bukan placeholder.";
  }

  return reason ? "Link sumber video tidak valid." : undefined;
}

export const specialEpisodeLabels = [
  "ova",
  "ona",
  "special",
  "extra",
  "final",
] as const satisfies readonly SpecialEpisodeLabel[];

const episodeNumberSchema = z
  .number()
  .int("Nomor episode harus bilangan bulat.")
  .nonnegative("Nomor episode minimal 0");

export const episodeInputSchema = z
  .object({
    animeId: z.string().min(1, "Pilih anime terlebih dahulu."),

    number: episodeNumberSchema.nullable(),

    specialLabel: z
      .enum(specialEpisodeLabels)
      .nullable()
      .default(null),

    title: z.string().trim(),

    embedUrl: z.string().trim().superRefine((value, context) => {
      const message = videoLinkError(value);

      if (message) {
        context.addIssue({
          code: "custom",
          message,
        });
      }
    }),

    thumbnailUrl: z.string().optional(),

    isPublished: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.specialLabel === null && value.number === null) {
      context.addIssue({
        code: "custom",
        path: ["number"],
        message: "Nomor episode wajib diisi untuk episode biasa.",
      });
    }

    if (value.specialLabel !== null && value.number !== null) {
      context.addIssue({
        code: "custom",
        path: ["number"],
        message: "Episode khusus tidak menggunakan nomor episode.",
      });
    }
  });

export type EpisodeInput = z.infer<typeof episodeInputSchema>;

export function nextEpisodeNumber(
  episodes: Episode[],
  animeId: string,
): number {
  return (
    episodes.reduce(
      (latest, episode) =>
        episode.animeId === animeId && episode.number !== null
          ? Math.max(latest, episode.number)
          : latest,
      -1,
    ) + 1
  );
}
