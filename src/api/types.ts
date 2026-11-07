// Shared TypeScript interfaces for the API layer.
// Components and pages must only access data through src/api/ — never directly.

export type AnimeStatus = "ongoing" | "completed" | "upcoming";
export type AnimeType = "tv" | "movie" | "ova" | "ona" | "special";

export type SpecialEpisodeLabel =
  | "ova"
  | "ona"
  | "special"
  | "extra"
  | "final";

export interface Anime {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  posterUrl: string;
  altTitle?: string;
  studio?: string;
  rating?: number | null;
  durationMinutes?: number | null;
  totalEpisodes?: number | null;
  status: AnimeStatus;
  type: AnimeType;
  season: string;
  year: number;
  isPublished: boolean;
  tagIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: string;
  animeId: string;
  number: number | null;
  specialLabel?: SpecialEpisodeLabel | null;
  title: string;
  embedUrl: string;
  thumbnailUrl?: string | undefined;
  isPublished: boolean;
  publishedAt: string;
  updatedAt?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  logoUrl: string | null;
  footerText: string;
}

export interface MockSession {
  username: string;
  loggedInAt: string;
}
