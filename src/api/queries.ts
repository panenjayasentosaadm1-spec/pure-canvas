import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  getAnimeBySlug,
  listAnime,
  listAnimeShared,
  listLatestAnime,
  type AnimeFilter,
} from "./anime";
import { getEpisode, listEpisodesByAnime, listEpisodesForAnimes } from "./episodes";
import { getLatestThumbnailsByAnime } from "./list-image";
import { publicAdSlotsQuery } from "./ad-slots";
import { getSettings } from "./settings";
import { listTags } from "./tags";
import type { Anime, SpecialEpisodeLabel } from "./types";
import { selectHomeAnimeSections } from "./home-sections";

export interface AnimeCardData {
  anime: Anime;
  imageUrl: string | undefined;
}

export interface EpisodeCardData {
  id: string;
  anime: Anime;
  number: number | null;
  specialLabel?: SpecialEpisodeLabel | null;
  publishedAt: string;
  imageUrl: string | undefined;
}

async function toAnimeCards(list: Anime[]): Promise<AnimeCardData[]> {
  const thumbnails = await getLatestThumbnailsByAnime(list.map((anime) => anime.id));
  return list.map((anime) => ({
    anime,
    imageUrl: (thumbnails.get(anime.id) ?? anime.posterUrl) || undefined,
  }));
}

/** Kartu yang selalu memakai poster anime, bukan thumbnail episode. */
export function toPosterCards(list: Anime[]): AnimeCardData[] {
  return list.map((anime) => ({
    anime,
    imageUrl: anime.posterUrl || undefined,
  }));
}

function publishedTime(iso: string): number {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
}

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: getSettings,
  staleTime: 5 * 60_000,
});

/**
 * Prefetch data site chrome (header/footer/iklan global) secara toleran:
 * kegagalan salah satu query tidak boleh menggagalkan halaman — komponen
 * memakai nilai bawaannya dan mencoba ulang di klien.
 */
export async function prefetchSiteChrome(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.fetchQuery(settingsQuery).catch(() => undefined),
    queryClient.fetchQuery(tagsQuery).catch(() => undefined),
    queryClient.fetchQuery(publicAdSlotsQuery).catch(() => undefined),
  ]);
}

export const tagsQuery = queryOptions({
  queryKey: ["tags"],
  queryFn: listTags,
  staleTime: 5 * 60_000,
});

export const latestAnimeQuery = queryOptions({
  queryKey: ["anime", "latest"],
  staleTime: 5 * 60_000,
  queryFn: () => listLatestAnime(10),
});

export const animeListQuery = (filter: AnimeFilter) =>
  queryOptions({
    queryKey: ["anime", "list", filter],
    staleTime: 5 * 60_000,
    queryFn: () => listAnime(filter),
  });

export const animeCardsQuery = (filter: AnimeFilter) =>
  queryOptions({
    queryKey: ["anime", "cards", filter],
    staleTime: 5 * 60_000,
    queryFn: async () => toAnimeCards(await listAnime(filter)),
  });

export const homeSectionsQuery = queryOptions({
  queryKey: ["home", "sections"],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const sections = selectHomeAnimeSections(await listAnimeShared());

    const [movieCards, completedCards, ongoingCards, popularCards, specialCards] = await Promise.all([
      Promise.resolve(toPosterCards(sections.movies)),
      Promise.resolve(toPosterCards(sections.completed)),
      Promise.resolve(toPosterCards(sections.ongoing)),
      Promise.resolve(toPosterCards(sections.popular)),
      Promise.resolve(toPosterCards(sections.specials)),
    ]);

    return {
      movies: movieCards,
      completed: completedCards,
      ongoing: ongoingCards,
      popular: popularCards,
      specials: specialCards,
    };
  },
});

export const latestEpisodesQuery = queryOptions({
  queryKey: ["episodes", "latest"],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<EpisodeCardData[]> => {
    const series = (await listAnimeShared()).filter(
      (anime) => anime.type !== "movie",
    );

    if (series.length === 0) return [];

    const seriesById = new Map(series.map((anime) => [anime.id, anime]));
    const episodes = await listEpisodesForAnimes(series.map((anime) => anime.id));

    return episodes
      .flatMap((episode) => {
        const anime = seriesById.get(episode.animeId);
        if (!anime) return [];

        return [{
          id: episode.id,
          anime,
          number: episode.number,
          specialLabel: episode.specialLabel ?? null,
          publishedAt: episode.publishedAt,
          imageUrl: episode.thumbnailUrl || anime.posterUrl || undefined,
        }];
      })
      .sort(
        (a, b) =>
          publishedTime(b.publishedAt) - publishedTime(a.publishedAt) ||
          (a.number ?? -1) - (b.number ?? -1),
      );
  },
});

export const animeDetailQuery = (slug: string) =>
  queryOptions({
    queryKey: ["anime", "detail", slug],
    staleTime: 5 * 60_000,
    queryFn: () => getAnimeBySlug(slug),
  });

export const episodesQuery = (animeId: string) =>
  queryOptions({
    queryKey: ["episodes", animeId],
    staleTime: 5 * 60_000,
    queryFn: () => listEpisodesByAnime(animeId),
  });

export const episodeQuery = (animeId: string, number: number) =>
  queryOptions({
    queryKey: ["episodes", animeId, number],
    staleTime: 5 * 60_000,
    queryFn: () => getEpisode(animeId, number),
  });
