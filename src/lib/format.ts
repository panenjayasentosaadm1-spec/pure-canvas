// Formatting helpers and Indonesian UI labels for the anime catalog.

import type { AnimeStatus, AnimeType } from "@/api/types";

/** Formats an ISO date with the id-ID locale, e.g. "20 Oktober 2026". */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export const statusLabel: Record<AnimeStatus, string> = {
  ongoing: "Sedang tayang",
  completed: "Tamat",
  upcoming: "Akan tayang",
};

export const typeLabel: Record<AnimeType, string> = {
  tv: "TV",
  movie: "Movie",
  ova: "OVA",
  ona: "ONA",
  special: "Spesial",
};

export const seasonLabel: Record<string, string> = {
  Winter: "Musim Dingin",
  Spring: "Musim Semi",
  Summer: "Musim Panas",
  Fall: "Musim Gugur",
};
