import { Link } from "@tanstack/react-router";
import { SafeImage } from "@/components/SafeImage";
import type { Episode } from "@/api/types";

function getEpisodeLabel(episode: Episode): string {
  if (episode.specialLabel) {
    return episode.specialLabel.toUpperCase();
  }

  return `EP ${episode.number}`;
}

function sortEpisodes(a: Episode, b: Episode): number {
  if (a.number !== null && b.number !== null) {
    return a.number - b.number;
  }

  if (a.number !== null) return -1;
  if (b.number !== null) return 1;

  return a.publishedAt.localeCompare(b.publishedAt);
}

export function EpisodeGrid({
  slug,
  episodes,
  posterUrl,
  animeTitle,
  currentEpisodeId,
}: {
  slug: string;
  episodes: Episode[];
  posterUrl: string;
  animeTitle: string;
  currentEpisodeId: string;
}) {
  const published = episodes
    .filter((episode) => episode.isPublished)
    .sort(sortEpisodes);

  if (published.length === 0) return null;

  return (
    <section className="mt-3.5 border-t border-border/60 pt-3.5 md:mt-5 md:pt-5">
      <h2 className="mb-3 text-lg font-semibold md:text-xl">
        Daftar Episode
      </h2>

      <ul className="grid grid-cols-3 gap-2.5 md:gap-3">
        {published.map((episode) => {
          const isCurrent = episode.id === currentEpisodeId;
          const label = getEpisodeLabel(episode);
          const imageAlt = `${animeTitle} - ${label}`;

          const card = (
            <>
              <div
                className={
                  isCurrent
                    ? "relative overflow-hidden rounded-md border border-primary ring-2 ring-primary"
                    : "relative overflow-hidden rounded-md border border-border transition-colors group-hover:border-primary"
                }
              >
                <SafeImage
                  src={episode.thumbnailUrl || posterUrl}
                  alt={imageAlt}
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                />

                <span className="absolute bottom-1 left-1 rounded-sm bg-background/90 px-1.5 py-0.5 text-[11px] font-semibold leading-tight text-foreground md:text-xs">
                  {label}
                </span>

                {isCurrent && (
                  <span className="absolute right-1 top-1 rounded-sm bg-primary px-1.5 py-0.5 text-[11px] font-medium leading-tight text-primary-foreground md:text-xs">
                    Sedang ditonton
                  </span>
                )}
              </div>

              <p
                className={
                  isCurrent
                    ? "mt-1.5 line-clamp-1 text-xs font-medium text-primary md:text-sm"
                    : "mt-1.5 line-clamp-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground md:text-sm"
                }
              >
                {episode.title || label}
              </p>
            </>
          );

          return (
            <li key={episode.id}>
              {episode.specialLabel ? (
                <Link
                  to="/anime/$slug/episode-khusus/$episodeId"
                  params={{ slug, episodeId: episode.id }}
                  aria-current={isCurrent ? "page" : undefined}
                  className="group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {card}
                </Link>
              ) : (
                <Link
                  to="/anime/$slug/episode/$number"
                  params={{ slug, number: String(episode.number) }}
                  aria-current={isCurrent ? "page" : undefined}
                  className="group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {card}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
