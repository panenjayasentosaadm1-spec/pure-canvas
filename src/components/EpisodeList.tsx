import { Link } from "@tanstack/react-router";
import { SafeImage } from "@/components/SafeImage";
import type { Episode } from "@/api/types";

export function EpisodeList({ slug, episodes, posterUrl, animeTitle }: { slug: string; episodes: Episode[]; posterUrl: string; animeTitle: string }) {
  const published = episodes.filter((episode) => episode.isPublished).sort((a, b) => b.number - a.number);
  return <section className="mt-8">
    <h2 className="mb-4 text-xl font-semibold">Daftar episode</h2>
    {published.length === 0 ? <p className="text-muted-foreground">Belum ada episode yang diterbitkan.</p> : <ul className="divide-y divide-border">
      {published.map((episode) => <li key={episode.id}>
        <Link to="/anime/$slug/episode/$number" params={{ slug, number: String(episode.number) }} className="flex items-center gap-4 py-4 hover:text-primary">
          <SafeImage src={episode.thumbnailUrl || posterUrl} alt={`${animeTitle} episode ${episode.number}`} loading="lazy" className="aspect-video w-24 shrink-0 rounded-md object-cover sm:w-40" />
          <div className="min-w-0"><p className="text-sm text-muted-foreground">Episode {episode.number}</p><h3 className="break-words font-semibold">{episode.title}</h3></div>
        </Link>
      </li>)}
    </ul>}
  </section>;
}