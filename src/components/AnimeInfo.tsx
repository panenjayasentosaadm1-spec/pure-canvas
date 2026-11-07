
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SafeImage } from "@/components/SafeImage";
import { Link } from "@tanstack/react-router";
import type { Anime, Episode, Tag } from "@/api/types";
import { Button } from "@/components/ui/button";
import { seasonLabel, statusLabel, typeLabel } from "@/lib/format";

export function AnimeInfo({
  anime,
  episodes,
  tags,
  action,
  heading = "h1",
  variant = "default",
}: {
  anime: Anime;
  episodes: Episode[];
  tags: Tag[];
  action?: ReactNode;
  heading?: "h1" | "h2";
  variant?: "default" | "compact";
}) {
  const [expanded, setExpanded] = useState(false);
  const [longSynopsis, setLongSynopsis] = useState(false);
  const synopsisRef = useRef<HTMLParagraphElement>(null);

  const genres = tags.filter((tag) => anime.tagIds.includes(tag.id));
  const season = seasonLabel[anime.season] ?? anime.season;
  const Heading = heading;
  const publishedCount = episodes.filter(
    (episode) => episode.isPublished,
  ).length;

  const extraDetails: [string, ReactNode][] = [
    ...(anime.altTitle?.trim()
      ? [["Judul alternatif", anime.altTitle.trim()] as [string, ReactNode]]
      : []),
    ...(anime.studio?.trim()
      ? [["Studio", anime.studio.trim()] as [string, ReactNode]]
      : []),
    ...(anime.rating != null
      ? [["Rating", `${anime.rating}/10`] as [string, ReactNode]]
      : []),
    ...(anime.durationMinutes != null
      ? [
          [
            "Durasi per episode",
            `${anime.durationMinutes} menit`,
          ] as [string, ReactNode],
        ]
      : []),
    ...(anime.totalEpisodes != null
      ? [
          [
            "Total episode",
            String(anime.totalEpisodes),
          ] as [string, ReactNode],
        ]
      : []),
  ];

  const details: [string, ReactNode][] = [
    ["Tipe", typeLabel[anime.type]],
    ["Status", statusLabel[anime.status]],
    ["Musim", season || "Belum ditentukan"],
    ["Tahun", String(anime.year)],
    ["Episode tersedia", String(publishedCount)],
    ...extraDetails,
    ["Genre", genres.map((tag) => tag.name).join(", ") || "Belum tersedia"],
  ];

  useEffect(() => {
    const element = synopsisRef.current;
    if (!element || expanded) return;

    const measure = () =>
      setLongSynopsis(element.scrollHeight > element.clientHeight + 1);

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [anime.synopsis, expanded]);

  if (variant === "compact") {
    return (
      <section aria-label="Informasi anime" className="min-w-0">
        <div className="flex min-w-0 gap-3 md:gap-4">
          <SafeImage
            src={anime.posterUrl}
            alt={anime.title}
            loading="lazy"
            className="aspect-[2/3] w-24 shrink-0 rounded-md border border-border object-cover md:w-28"
          />

          <div className="min-w-0 flex-1">
            <Heading className="break-words text-lg font-bold leading-6 tracking-normal md:text-2xl md:leading-8">
              {anime.title}
            </Heading>

            {anime.altTitle?.trim() && (
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {anime.altTitle}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {genres.map((tag) => (
                <Link
                  key={tag.id}
                  to="/genres"
                  hash={tag.slug}
                  className="rounded-md bg-accent px-2 py-0.5 text-xs text-primary hover:underline md:text-sm"
                >
                  {tag.name}
                </Link>
              ))}
            </div>

            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground md:text-sm">
              <span>Tahun: {anime.year}</span>
              <span>{statusLabel[anime.status]}</span>
              <span>{typeLabel[anime.type]}</span>
              <span>{publishedCount} episode tersedia</span>
              {anime.rating != null && <span>Rating: {anime.rating}/10</span>}
              {anime.studio?.trim() && <span>Studio: {anime.studio}</span>}
              {anime.durationMinutes != null && (
                <span>{anime.durationMinutes} menit/episode</span>
              )}
              {anime.totalEpisodes != null && (
                <span>Total: {anime.totalEpisodes} episode</span>
              )}
            </p>
          </div>
        </div>

        <h3 className="mt-4 text-base font-semibold tracking-normal md:text-lg">
          Sinopsis
        </h3>

        <p
          ref={synopsisRef}
          id={`synopsis-${anime.id}`}
          className={`mt-1.5 whitespace-pre-line break-words leading-6 text-sm text-muted-foreground ${
            expanded ? "" : "line-clamp-5"
          }`}
        >
          {anime.synopsis}
        </p>

        {longSynopsis && (
          <Button
            variant="link"
            className="h-7 px-0 text-sm"
            aria-expanded={expanded}
            aria-controls={`synopsis-${anime.id}`}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Tutup" : "Selengkapnya"}
          </Button>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Informasi anime"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[240px_minmax(0,1fr)]"
    >
      <SafeImage
        src={anime.posterUrl}
        alt={anime.title}
        loading="eager"
        className="aspect-[2/3] w-full max-w-60 rounded-md border border-border object-cover"
      />

      <div className="min-w-0">
        <Heading className="break-words text-3xl font-bold tracking-normal md:text-4xl">
          {anime.title}
        </Heading>

        {anime.altTitle?.trim() && (
          <p className="mt-2 break-words text-base text-muted-foreground md:text-lg">
            {anime.altTitle}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {[typeLabel[anime.type], statusLabel[anime.status], `${season} ${anime.year}`]
            .filter(Boolean)
            .map((badge) => (
              <span
                key={badge}
                className="rounded-md border border-border bg-card px-3 py-1 text-sm"
              >
                {badge}
              </span>
            ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {genres.map((tag) => (
            <Link
              key={tag.id}
              to="/genres"
              hash={tag.slug}
              className="rounded-md bg-accent px-3 py-1 text-sm text-primary hover:underline"
            >
              {tag.name}
            </Link>
          ))}
        </div>

        {action && <div className="mt-5">{action}</div>}

        <h3 className="mt-6 text-xl font-semibold tracking-normal">
          Sinopsis
        </h3>

        <p
          ref={synopsisRef}
          id={`synopsis-${anime.id}`}
          className={`mt-2 whitespace-pre-line break-words leading-7 text-muted-foreground ${
            expanded ? "" : "line-clamp-5"
          }`}
        >
          {anime.synopsis}
        </p>

        {longSynopsis && (
          <Button
            variant="link"
            className="h-8 px-0"
            aria-expanded={expanded}
            aria-controls={`synopsis-${anime.id}`}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Tutup" : "Selengkapnya"}
          </Button>
        )}

        <dl className="mt-6 grid gap-x-8 gap-y-3 border-t border-border pt-5 sm:grid-cols-2">
          {details.map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 text-sm"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-words font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
