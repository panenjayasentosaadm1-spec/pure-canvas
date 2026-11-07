import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Play } from "lucide-react";
import { publicHeroQuery } from "@/api/hero";
import { statusLabel, typeLabel } from "@/lib/format";

/**
 * Homepage hero above Banner 1. Renders nothing while loading, on errors, or
 * when the feature is disabled/empty, so the homepage never depends on it.
 */
export function FeaturedHero() {
  const { data } = useQuery(publicHeroQuery);
  const [index, setIndex] = useState(0);
  const animes = data?.animes ?? [];
  if (!data?.enabled || animes.length === 0) return null;
  const activeIndex = Math.min(index, animes.length - 1);
  const current = animes[activeIndex]!;

  return (
    <section aria-label="Anime unggulan" className="relative isolate my-8 overflow-hidden rounded-2xl border border-border bg-card">
      {current.posterUrl && (
        <img
          src={current.posterUrl}
          alt=""
          aria-hidden
          loading="eager"
          className="absolute inset-0 -z-20 h-full w-full scale-110 object-cover opacity-30 blur-lg"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/80 to-background/30" />

      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:gap-7 sm:p-8">
        {current.posterUrl && (
          <img
            src={current.posterUrl}
            alt={`Poster ${current.title}`}
            loading="eager"
            className="w-28 shrink-0 rounded-lg border border-border object-cover shadow-lg sm:w-36"
          />
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Unggulan</p>
          <h2 className="mt-1 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {current.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              typeLabel[current.type],
              statusLabel[current.status],
              current.year || null,
            ].filter(Boolean).join(" • ")}
          </p>
          {current.synopsis && (
            <p className="mt-3 line-clamp-2 max-w-prose text-sm text-muted-foreground sm:line-clamp-3">
              {current.synopsis}
            </p>
          )}
          <Link
            to="/anime/$slug"
            params={{ slug: current.slug }}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Play className="h-4 w-4" aria-hidden />
            Tonton sekarang
          </Link>
        </div>
      </div>

      {animes.length > 1 && (
        <div className="flex gap-1.5 px-6 pb-5 sm:px-8 sm:pb-6">
          {animes.map((anime, itemIndex) => (
            <button
              key={anime.id}
              type="button"
              onClick={() => setIndex(itemIndex)}
              aria-label={`Tampilkan ${anime.title}`}
              aria-current={itemIndex === activeIndex}
              className={`h-2 w-6 rounded-full transition-colors ${itemIndex === activeIndex ? "bg-primary" : "bg-muted-foreground/40 hover:bg-muted-foreground/70"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
