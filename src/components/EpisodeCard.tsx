import { Link } from "@tanstack/react-router";
import type { EpisodeCardData } from "@/api/queries";
import { PosterCard } from "@/components/PosterCard";
import { statusLabel, typeLabel } from "@/lib/format";

function getEpisodeLabel(item: EpisodeCardData): string {
  if (item.specialLabel) {
    return item.specialLabel.toUpperCase();
  }

  return `EP ${item.number}`;
}

/** Episode card: episode thumbnail (poster fallback), episode badge, opens the correct episode page. */
export function EpisodeCard({
  item,
  loading = "lazy",
}: {
  item: EpisodeCardData;
  loading?: "lazy" | "eager";
}) {
  const label = getEpisodeLabel(item);
  const isSpecial = Boolean(item.specialLabel);

  if (isSpecial) {
    return (
      <Link
        to="/anime/$slug/episode-khusus/$episodeId"
        params={{
          slug: item.anime.slug,
          episodeId: item.id,
        }}
        aria-label={`${item.anime.title} - ${label}`}
      >
        <PosterCard
          title={item.anime.title}
          imageAlt={`${item.anime.title} - ${label}`}
          loading={loading}
          posterUrl={item.imageUrl}
          meta={`${typeLabel[item.anime.type]} • ${statusLabel[item.anime.status]}`}
          badge={label}
        />
      </Link>
    );
  }

  if (item.number === null) {
    return null;
  }

  return (
    <Link
      to="/anime/$slug/episode/$number"
      params={{
        slug: item.anime.slug,
        number: String(item.number),
      }}
      aria-label={`${item.anime.title} - Episode ${item.number}`}
    >
      <PosterCard
        title={item.anime.title}
        imageAlt={`${item.anime.title} episode ${item.number}`}
        loading={loading}
        posterUrl={item.imageUrl}
        meta={`${typeLabel[item.anime.type]} • ${statusLabel[item.anime.status]}`}
        badge={label}
      />
    </Link>
  );
}
