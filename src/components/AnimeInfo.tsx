import { useEffect, useRef, useState, type ReactNode } from "react";
import { SafeImage } from "@/components/SafeImage";
import { Link } from "@tanstack/react-router";
import type { Anime, Episode, Tag } from "@/api/types";
import { Button } from "@/components/ui/button";
import { seasonLabel, statusLabel, typeLabel } from "@/lib/format";
import { Star } from "lucide-react";

export function AnimeInfo({ anime, episodes, tags, action, heading = "h1" }: {
  anime: Anime;
  episodes: Episode[];
  tags: Tag[];
  action?: ReactNode;
  heading?: "h1" | "h2";
}) {
  const [expanded, setExpanded] = useState(false);
  const [longSynopsis, setLongSynopsis] = useState(false);
  const synopsisRef = useRef<HTMLParagraphElement>(null);
  const genres = tags.filter((tag) => anime.tagIds.includes(tag.id));
  const season = seasonLabel[anime.season] ?? anime.season;
  const Heading = heading;

  useEffect(() => {
    const element = synopsisRef.current;
    if (!element || expanded) return;
    const measure = () => setLongSynopsis(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [anime.synopsis, expanded]);

  const details: [string, ReactNode][] = [
    ["Tipe", typeLabel[anime.type]],
    ["Status", statusLabel[anime.status]],
    ["Musim", season],
    ["Tahun", String(anime.year)],
    ["Jumlah episode", String(episodes.filter((episode) => episode.isPublished).length)],
    ["Genre", genres.map((tag) => tag.name).join(", ") || "Belum tersedia"],
  ];
  if (anime.studio?.trim()) details.push(["Studio", anime.studio]);
  if (anime.rating !== undefined) details.push(["Rating", <span className="inline-flex items-center gap-1"><Star aria-label="Bintang" className="size-4 text-primary" />{anime.rating} / 10</span>]);
  if (anime.durationMinutes) details.push(["Durasi", `${anime.durationMinutes} menit`]);
  if (anime.totalEpisodes) details.push(["Total episode", String(anime.totalEpisodes)]);

  return <section aria-label="Informasi anime" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
    <SafeImage src={anime.posterUrl} alt={anime.title} loading="lazy" className="aspect-[2/3] w-full max-w-60 rounded-md border border-border object-cover" />
    <div className="min-w-0">
      <Heading className="break-words text-3xl font-bold tracking-normal md:text-4xl">{anime.title}</Heading>
      {anime.altTitle?.trim() && <p className="mt-2 text-muted-foreground">{anime.altTitle}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {[typeLabel[anime.type], statusLabel[anime.status], `${season} ${anime.year}`].map((badge) => <span key={badge} className="rounded-md border border-border bg-card px-3 py-1 text-sm">{badge}</span>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {genres.map((tag) => <Link key={tag.id} to="/genres" hash={tag.slug} className="rounded-md bg-accent px-3 py-1 text-sm text-primary hover:underline">{tag.name}</Link>)}
      </div>
      {action && <div className="mt-5">{action}</div>}
      <h3 className="mt-6 text-xl font-semibold tracking-normal">Sinopsis</h3>
      <p ref={synopsisRef} id={`synopsis-${anime.id}`} className={`mt-2 whitespace-pre-line break-words leading-7 text-muted-foreground ${expanded ? "" : "line-clamp-5"}`}>{anime.synopsis}</p>
      {longSynopsis && <Button variant="link" className="h-8 px-0" aria-expanded={expanded} aria-controls={`synopsis-${anime.id}`} onClick={() => setExpanded((value) => !value)}>{expanded ? "Tutup" : "Selengkapnya"}</Button>}
      <dl className="mt-6 grid gap-x-8 gap-y-3 border-t border-border pt-5 sm:grid-cols-2">
        {details.map(([label, value]) => <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}
      </dl>
    </div>
  </section>;
}