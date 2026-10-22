import { z } from "zod";

export function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const optionalText = z.string().trim().optional();
export const animeInputSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi."),
  slug: z.string().trim().min(1, "Slug wajib diisi.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung."),
  altTitle: optionalText,
  synopsis: z.string().trim(),
  posterUrl: z.string().refine((value) => !value || /^https?:\/\//.test(value) || /^data:image\/(jpeg|png|webp);base64,/.test(value), "Poster harus berupa gambar yang valid."),
  studio: optionalText,
  rating: z.number().min(0, "Rating minimal 0.").max(10, "Rating maksimal 10.").optional(),
  type: z.enum(["tv", "movie", "ova", "ona", "special"]),
  status: z.enum(["ongoing", "completed", "upcoming"]),
  season: z.string(),
  year: z.number().int("Tahun harus bilangan bulat.").min(1900, "Tahun minimal 1900.").max(2200, "Tahun maksimal 2200."),
  durationMinutes: z.number().int("Durasi harus bilangan bulat.").positive("Durasi harus lebih dari 0.").optional(),
  totalEpisodes: z.number().int("Total episode harus bilangan bulat.").positive("Total episode harus lebih dari 0.").optional(),
  tagIds: z.array(z.string()),
  isPublished: z.boolean(),
});
export type AnimeInput = z.infer<typeof animeInputSchema>;