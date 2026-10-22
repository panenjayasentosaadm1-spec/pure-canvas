
import { queryOptions } from "@tanstack/react-query";
import {
  getAnimeBySlug,
  listAnime,
  listLatestAnime,
  type AnimeFilter,
} from "./anime";
import { getEpisode, listEpisodesByAnime } from "./episodes";
import { getListImageAsync } from "./list-image";
import { getSettings } from "./settings";
import { listTags } from "./tags";
import type { Anime } from "./types";

export interface AnimeCardData {
  anime: Anime;
  imageUrl: string | undefined;
}

export interface EpisodeCardData {
  id: string;
  anime: Anime;
  number: number;
  publishedAt: string;
  imageUrl: string | undefined;
}

async function toAnimeCards(list: Anime[]): Promise<AnimeCardData[]> {
  return Promise.all(
    list.map(async (anime) => ({
      anime,
      imageUrl: await getListImageAsync(anime),
    })),
  );
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

export const tagsQuery = queryOptions({
  queryKey: ["tags"],
  queryFn: listTags,
  staleTime: 5 * 60_000,
});

export const latestAnimeQuery = queryOptions({
  queryKey: ["anime", "latest"],
  queryFn: () => listLatestAnime(10),
});

export const animeListQuery = (filter: AnimeFilter) =>
  queryOptions({
    queryKey: ["anime", "list", filter],
    queryFn: () => listAnime(filter),
  });

export const animeCardsQuery = (filter: AnimeFilter) =>
  queryOptions({
    queryKey: ["anime", "cards", filter],
    queryFn: async () => toAnimeCards(await listAnime(filter)),
  });

export const homeSectionsQuery = queryOptions({
  queryKey: ["home", "sections"],
  queryFn: async () => {
    const published = await listAnime();

    const movies = published
      .filter((anime) => anime.type === "movie")
      .slice(0, 10);

    const completed = published
      .filter((anime) => anime.status === "completed")
      .slice(0, 10);

    const [movieCards, completedCards] = await Promise.all([
      toAnimeCards(movies),
      Promise.resolve(toPosterCards(completed)),
    ]);

    return {
      movies: movieCards,
      completed: completedCards,
    };
  },
});

export const latestEpisodesQuery = queryOptions({
  queryKey: ["episodes", "latest"],
  queryFn: async (): Promise<EpisodeCardData[]> => {
    const series = (await listAnime()).filter(
      (anime) => anime.type !== "movie",
    );

    const perAnime = await Promise.all(
      series.map(async (anime) =>
        (await listEpisodesByAnime(anime.id)).map((episode) => ({
          id: episode.id,
          anime,
          number: episode.number,
          publishedAt: episode.publishedAt,
          imageUrl: episode.thumbnailUrl || anime.posterUrl || undefined,
        })),
      ),
    );

    return perAnime
      .flat()
      .sort(
        (a, b) =>
          publishedTime(b.publishedAt) - publishedTime(a.publishedAt) ||
          b.number - a.number,
      );
  },
});

export const animeDetailQuery = (slug: string) =>
  queryOptions({
    queryKey: ["anime", "detail", slug],
    queryFn: () => getAnimeBySlug(slug),
  });

export const episodesQuery = (animeId: string) =>
  queryOptions({
    queryKey: ["episodes", animeId],
    queryFn: () => listEpisodesByAnime(animeId),
  });

export const episodeQuery = (animeId: string, number: number) =>
  queryOptions({
    queryKey: ["episodes", animeId, number],
    queryFn: () => getEpisode(animeId, number),
  });
