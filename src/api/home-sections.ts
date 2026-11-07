import type { Anime } from "./types";

const SECTION_LIMIT = 10;

export function selectHomeAnimeSections(published: Anime[]) {
  const publicAnime = published.filter((anime) => anime.isPublished);
  const byTitle = (left: Anime, right: Anime) => left.title.localeCompare(right.title);
  const byPopularity = (left: Anime, right: Anime) =>
    (right.rating ?? 0) - (left.rating ?? 0) || byTitle(left, right);

  return {
    ongoing: publicAnime
      .filter((anime) => anime.status === "ongoing")
      .sort(byTitle)
      .slice(0, SECTION_LIMIT),
    completed: publicAnime
      .filter((anime) => anime.status === "completed" && anime.type === "tv")
      .sort(byTitle)
      .slice(0, SECTION_LIMIT),
    movies: publicAnime
      .filter((anime) => anime.type === "movie")
      .sort(byTitle)
      .slice(0, SECTION_LIMIT),
    popular: publicAnime
      .filter((anime) => anime.rating !== null && anime.rating !== undefined)
      .sort(byPopularity)
      .slice(0, SECTION_LIMIT),
    specials: publicAnime
      .filter((anime) => anime.type === "ova" || anime.type === "ona" || anime.type === "special")
      .sort(byTitle)
      .slice(0, SECTION_LIMIT),
  };
}