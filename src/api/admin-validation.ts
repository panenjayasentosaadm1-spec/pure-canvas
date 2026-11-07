import { z } from "zod";

export function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const animeInputSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi."),
  altTitle: z.string().trim().optional(),
  slug: z.string().trim().min(1, "Slug wajib diisi.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung."),
  synopsis: z.string().trim(),
  studio: z.string().trim().optional(),
  rating: z.number().min(0).max(10).nullable().optional(),
  posterUrl: z.string().refine((value) => !value || /^https?:\/\//.test(value) || /^data:image\/(jpeg|png|webp);base64,/.test(value), "Poster harus berupa gambar yang valid."),
  type: z.enum(["tv", "movie", "ova", "ona", "special"]),
  status: z.enum(["ongoing", "completed", "upcoming"]),
  season: z.string(),
  year: z.number().int("Tahun harus bilangan bulat.").min(1900, "Tahun minimal 1900.").max(2200, "Tahun maksimal 2200."),
  durationMinutes: z.number().int().min(1).nullable().optional(),
  totalEpisodes: z.number().int().min(1).nullable().optional(),
  tagIds: z.array(z.string()),
  isPublished: z.boolean(),
});
export type AnimeInput = z.infer<typeof animeInputSchema>;