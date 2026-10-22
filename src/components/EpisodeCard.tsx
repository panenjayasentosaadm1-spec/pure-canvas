import { Link } from "@tanstack/react-router";
import type { EpisodeCardData } from "@/api/queries";
import { PosterCard } from "@/components/PosterCard";
import { statusLabel, typeLabel } from "@/lib/format";

/** Episode card: episode thumbnail (poster fallback), "EP n" badge, opens the episode page. */
export function EpisodeCard({ item, loading = "lazy" }: { item: EpisodeCardData; loading?: "lazy" | "eager" }) {
  return (
    <Link
      to="/anime/$slug/episode/$number"
      params={{ slug: item.anime.slug, number: String(item.number) }}
      aria-label={`${item.anime.title} - Episode ${item.number}`}
    >
      <PosterCard
        title={item.anime.title}
        imageAlt={`${item.anime.title} episode ${item.number}`}
        loading={loading}
        posterUrl={item.imageUrl}
        meta={`${typeLabel[item.anime.type]} • ${statusLabel[item.anime.status]}`}
        badge={`EP ${item.number}`}
      />
    </Link>
  );
}
