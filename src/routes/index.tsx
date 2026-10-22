import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PosterCard, PosterGrid } from "@/components/PosterCard";
import { EpisodeCard } from "@/components/EpisodeCard";
import { PageSkeleton } from "@/components/PageSkeleton";
import { homeSectionsQuery, latestEpisodesQuery, settingsQuery, type AnimeCardData } from "@/api/queries";
import { statusLabel, typeLabel } from "@/lib/format";

const HOME_LATEST_LIMIT = 15;

export const Route = createFileRoute("/")({
  // Store data lives in the browser; never render it on the server.
  ssr: false,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.fetchQuery(latestEpisodesQuery),
      context.queryClient.fetchQuery(homeSectionsQuery),
      context.queryClient.fetchQuery(settingsQuery),
    ]),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "UsagiNime — Episode anime, tertata rapi" },
      { name: "description", content: "Jelajahi serial anime dan tonton episode yang disematkan dari sumber resminya." },
      { property: "og:title", content: "UsagiNime" },
      { property: "og:description", content: "Jelajahi serial anime dan tonton episode yang disematkan." },
    ],
  }),
  pendingComponent: () => <PageSkeleton />,
  errorComponent: ResourceError,
  notFoundComponent: ResourceNotFound,
  component: Index,
});

function Index() {
  const { data: latest } = useSuspenseQuery(latestEpisodesQuery);
  const { data: sections } = useSuspenseQuery(homeSectionsQuery);
  const { data: settings } = useSuspenseQuery(settingsQuery);
  const newest = latest.slice(0, HOME_LATEST_LIMIT);
  const [firstRowSize, setFirstRowSize] = useState(2);
  useEffect(() => {
    const tablet = window.matchMedia("(min-width: 768px)");
    const desktop = window.matchMedia("(min-width: 1024px)");
    const update = () => setFirstRowSize(desktop.matches ? 4 : tablet.matches ? 3 : 2);
    update();
    tablet.addEventListener("change", update);
    desktop.addEventListener("change", update);
    return () => { tablet.removeEventListener("change", update); desktop.removeEventListener("change", update); };
  }, []);

  return (
    <SiteLayout>
      <section className="mb-12 rounded-3xl border border-border bg-card p-8 md:p-12">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">Selamat datang</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-extrabold md:text-6xl">
          Sudut nyamanmu untuk <span className="text-gradient-primary">anime</span>.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          {settings.tagline} Jelajahi katalog, pilih serial favoritmu, dan tonton episode per episode.
        </p>
        <Link
          to="/anime"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Jelajahi anime <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <SectionHeading title="Anime Terbaru" to="/terbaru" />
      {newest.length === 0 ? (
        <p className="text-muted-foreground">Belum ada episode terbaru.</p>
      ) : (
        <PosterGrid>
          {newest.map((item, index) => <EpisodeCard key={item.id} item={item} loading={index < firstRowSize ? "eager" : "lazy"} />)}
        </PosterGrid>
      )}

      <SectionHeading title="Movie" className="mt-12" search={{ type: "movie" }} />
      <AnimeCards items={sections.movies} badge="MOVIE" empty="Belum ada movie." />

      <SectionHeading title="Tamat" className="mt-12 mb-4" search={{ status: "completed" }} />
      <AnimeCards items={sections.completed} badge="TAMAT" empty="Belum ada anime tamat." />
    </SiteLayout>
  );
}

function AnimeCards({ items, badge, empty }: { items: AnimeCardData[]; badge: string; empty: string }) {
  if (items.length === 0) return <p className="text-muted-foreground">{empty}</p>;
  return (
    <PosterGrid>
      {items.map(({ anime, imageUrl }) => (
        <Link key={anime.id} to="/anime/$slug" params={{ slug: anime.slug }} aria-label={anime.title}>
          <PosterCard
            title={anime.title}
            posterUrl={imageUrl}
            meta={`${typeLabel[anime.type]} • ${statusLabel[anime.status]}`}
            badge={badge}
          />
        </Link>
      ))}
    </PosterGrid>
  );
}

function SectionHeading({ title, className, to = "/anime", search }: { title: string; className?: string; to?: "/anime" | "/terbaru"; search?: { type?: string; status?: "completed" } }) {
  return (
    <div className={`mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 ${className ?? ""}`}>
      <h2 className="text-xl font-semibold">{title}</h2>
      <Link to={to} search={search ?? {}} className="text-sm text-primary hover:underline">
        Lihat semua
      </Link>
    </div>
  );
}
