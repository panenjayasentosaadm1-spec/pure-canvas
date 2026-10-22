// Shared TypeScript interfaces for the mock data layer.
// Components and pages must only access data through src/api/ — never directly.

export type AnimeStatus = "ongoing" | "completed" | "upcoming";
export type AnimeType = "tv" | "movie" | "ova" | "ona" | "special";

export interface Anime {
  id: string;
  title: string;
  slug: string;
  altTitle?: string | undefined;
  studio?: string | undefined;
  rating?: number | undefined;
  durationMinutes?: number | undefined;
  totalEpisodes?: number | undefined;
  synopsis: string;
  posterUrl: string;
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
  number: number;
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
