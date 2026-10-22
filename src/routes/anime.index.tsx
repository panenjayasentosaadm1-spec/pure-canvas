import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { SiteLayout, PageTitle } from "@/components/layout/SiteLayout";
import { PosterCard, PosterGrid } from "@/components/PosterCard";
import { animeCardsQuery, tagsQuery } from "@/api/queries";
import { PageSkeleton } from "@/components/PageSkeleton";
import { statusLabel, typeLabel } from "@/lib/format";
import type { AnimeStatus, AnimeType } from "@/api/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnimeSearch = {
  type?: string | undefined;
  q?: string | undefined;
  status?: AnimeStatus | undefined;
  genre?: string | undefined;
};

const statuses: AnimeStatus[] = ["ongoing", "completed", "upcoming"];
const types: AnimeType[] = ["tv", "movie", "ova", "ona", "special"];

function validateSearch(search: Record<string, unknown>): AnimeSearch {
  const q = search["q"];
  const status = search["status"];
  const genre = search["genre"];
  return {
    type: typeof search["type"] === "string" ? search["type"] : undefined,
    q: typeof q === "string" && q.trim() ? q : undefined,
    status: statuses.includes(status as AnimeStatus) ? (status as AnimeStatus) : undefined,
    genre: typeof genre === "string" && genre ? genre : undefined,
  };
}

export const Route = createFileRoute("/anime/")({
  ssr: false,
  validateSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const tags = await context.queryClient.fetchQuery(tagsQuery);
    const tagId = deps.genre ? tags.find((t) => t.slug === deps.genre)?.id : undefined;
    return context.queryClient.fetchQuery(
      animeCardsQuery({ query: deps.q, status: deps.status, tagId }),
    );
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Anime — UsagiNime" },
      { name: "description", content: "Jelajahi semua serial anime di UsagiNime." },
      { property: "og:title", content: "Anime — UsagiNime" },
      { property: "og:description", content: "Jelajahi semua serial anime di UsagiNime." },
    ],
  }),
  pendingComponent: () => <PageSkeleton />,
  errorComponent: ResourceError,
  notFoundComponent: ResourceNotFound,
  component: AnimeCatalog,
});

function AnimeCatalog() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/anime" });
  const { data: tags } = useSuspenseQuery(tagsQuery);
  const tagId = search.genre ? tags.find((t) => t.slug === search.genre)?.id : undefined;
  const { data: allAnime } = useSuspenseQuery(
    animeCardsQuery({ query: search.q, status: search.status, tagId }),
  );
  const anime = allAnime.filter(({ anime }) => !search.type || anime.type === search.type);

  const [query, setQuery] = useState(search.q ?? "");
  useEffect(() => setQuery(search.q ?? ""), [search.q]);

  function update(next: AnimeSearch) {
    navigate({ search: (previous) => ({ ...previous, ...next }) });
  }

  return (
    <SiteLayout>
      <PageTitle title="Anime" subtitle="Semua serial dan movie di katalog UsagiNime." />

      <div className="mb-6 flex flex-col gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: query.trim() || undefined });
          }}
          className="flex max-w-md items-center gap-2 rounded-full border border-input bg-card px-4 py-2 text-sm"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cari anime..."
            aria-label="Cari anime"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={!search.type} onClick={() => update({ type: undefined })}>Semua tipe</FilterChip>
          {types.map((type) => <FilterChip key={type} active={search.type === type} onClick={() => update({ type })}>{typeLabel[type]}</FilterChip>)}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={!search.status} onClick={() => update({ status: undefined })}>
            Semua status
          </FilterChip>
          {statuses.map((s) => (
            <FilterChip key={s} active={search.status === s} onClick={() => update({ status: s })}>
              {statusLabel[s]}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={!search.genre} onClick={() => update({ genre: undefined })}>
            Semua genre
          </FilterChip>
          {tags.map((t) => (
            <FilterChip key={t.id} active={search.genre === t.slug} onClick={() => update({ genre: t.slug })}>
              {t.name}
            </FilterChip>
          ))}
        </div>
      </div>

      {anime.length === 0 ? (
        <p className="text-muted-foreground">Anime tidak ditemukan</p>
      ) : (
        <PosterGrid>
          {anime.map(({ anime: a, imageUrl }) => (
            <Link key={a.id} to="/anime/$slug" params={{ slug: a.slug }} aria-label={a.title}>
              <PosterCard title={a.title} posterUrl={imageUrl} meta={`${typeLabel[a.type]} • ${statusLabel[a.status]}`} />
            </Link>
          ))}
        </PosterGrid>
      )}
    </SiteLayout>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <Button
      variant="outline"
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-auto rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Button>
  );
}
