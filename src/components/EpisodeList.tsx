import { Link } from "@tanstack/react-router";
import { SafeImage } from "@/components/SafeImage";
import type { Episode } from "@/api/types";

function getEpisodeLabel(episode: Episode): string {
  return episode.specialLabel
    ? episode.specialLabel.toUpperCase()
    : `Episode ${episode.number}`;
}

function sortEpisodes(a: Episode, b: Episode): number {
  if (a.number !== null && b.number !== null) {
    return b.number - a.number;
  }

  if (a.number !== null) return -1;
  if (b.number !== null) return 1;

  return b.publishedAt.localeCompare(a.publishedAt);
}

export function EpisodeList({
  slug,
  episodes,
  posterUrl,
  animeTitle,
}: {
  slug: string;
  episodes: Episode[];
  posterUrl: string;
  animeTitle: string;
}) {
  const published = episodes
    .filter((episode) => episode.isPublished)
    .sort(sortEpisodes);

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-xl font-semibold">Daftar episode</h2>

      {published.length === 0 ? (
        <p className="text-muted-foreground">
          Belum ada episode yang diterbitkan.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {published.map((episode) => {
            const label = getEpisodeLabel(episode);
            const content = (
              <>
                <SafeImage
                  src={episode.thumbnailUrl || posterUrl}
                  alt={`${animeTitle} - ${label}`}
                  loading="lazy"
                  className="aspect-video w-24 shrink-0 rounded-md object-cover sm:w-40"
                />

                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <h3 className="break-words font-semibold">
                    {episode.title || label}
                  </h3>
                </div>
              </>
            );

            return (
              <li key={episode.id}>
                {episode.specialLabel ? (
                  <Link
                    to="/anime/$slug/episode-khusus/$episodeId"
                    params={{ slug, episodeId: episode.id }}
                    className="flex items-center gap-4 py-4 hover:text-primary"
                  >
                    {content}
                  </Link>
                ) : (
                  <Link
                    to="/anime/$slug/episode/$number"
                    params={{
                      slug,
                      number: String(episode.number),
                    }}
                    className="flex items-center gap-4 py-4 hover:text-primary"
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
