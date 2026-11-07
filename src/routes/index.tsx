import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { POSTER_CARD_ASPECT, PosterCard, PosterGrid } from "@/components/PosterCard";
import { EpisodeCard } from "@/components/EpisodeCard";
import { PageSkeleton } from "@/components/PageSkeleton";
import { homeSectionsQuery, latestEpisodesQuery, prefetchSiteChrome, type AnimeCardData } from "@/api/queries";
import { publicHeroQuery } from "@/api/hero";
import { canonicalHead } from "@/lib/head-meta";
import { statusLabel, typeLabel } from "@/lib/format";
import { BannerAd } from "@/components/ads/AdSlots";
import { FeaturedHero } from "@/components/FeaturedHero";

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.fetchQuery(latestEpisodesQuery),
      context.queryClient.fetchQuery(homeSectionsQuery),
      // Hero dan site chrome di-prefetch agar HTML awal dari server sudah
      // memuat header, footer, dan bagian unggulan.
      context.queryClient.fetchQuery(publicHeroQuery).catch(() => undefined),
      prefetchSiteChrome(context.queryClient),
    ]),
  head: () => {
    const canonical = canonicalHead("/");
    return {
      meta: [
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { title: "UsagiNime — Nonton Anime Sub Indo Terbaru & Lengkap" },
        { name: "description", content: "Nonton anime subtitle Indonesia dengan koleksi anime terbaru, ongoing, tamat, movie, OVA, dan ONA. Temukan anime favoritmu dan ikuti episode terbarunya di UsagiNime." },
        { property: "og:title", content: "UsagiNime — Nonton Anime Sub Indo Terbaru & Lengkap" },
        { property: "og:description", content: "Nonton anime subtitle Indonesia dengan koleksi anime terbaru, ongoing, tamat, movie, OVA, dan ONA. Temukan anime favoritmu dan ikuti episode terbarunya di UsagiNime." },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
  pendingComponent: () => <PageSkeleton />,
  errorComponent: ResourceError,
  notFoundComponent: ResourceNotFound,
  component: Index,
});

function Index() {
  const { data: latest } = useSuspenseQuery(latestEpisodesQuery);
  const { data: sections } = useSuspenseQuery(homeSectionsQuery);
  const newest = latest.slice(0, 15);
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
    <SiteLayout wide>
      <FeaturedHero />
      <BannerAd id="homepage_banner_1" />
      {newest.length === 0 ? null : (
        <section>
          <SectionHeading
            title="Update Episode Terbaru"
            subtitle="Episode anime yang paling baru diterbitkan."
            to="/terbaru"
            as="h1"
          />
          <PosterGrid>
            {newest.map((item, index) => <EpisodeCard key={item.id} item={item} loading={index < firstRowSize ? "eager" : "lazy"} />)}
          </PosterGrid>
        </section>
      )}

      <BannerAd id="homepage_banner_2" />

      <AnimeSection
        title="Anime Ongoing"
        className="mt-12"
        to="/anime"
        search={{ status: "ongoing" }}
        items={sections.ongoing}
        badge="ONGOING"
        compact={false}
      />

      <AnimeSection
        title="Anime Tamat"
        className="mt-12"
        search={{ status: "completed" }}
        items={sections.completed}
        badge="TAMAT"
      />

      <AnimeSection
        title="Movie Anime"
        className="mt-12"
        search={{ type: "movie" }}
        items={sections.movies}
        badge="MOVIE"
      />

      <AnimeSection
        title="Anime Populer"
        className="mt-12"
        items={sections.popular}
      />

      <AnimeSection
        title="OVA & ONA"
        className="mt-12"
        items={sections.specials}
      />
    </SiteLayout>
  );
}

function AnimeSection({ title, className, to = "/anime", search, items, badge, compact = true }: {
  title: string;
  className?: string;
  to?: "/anime" | "/terbaru";
  search?: { type?: string; status?: "ongoing" | "completed" };
  items: AnimeCardData[];
  badge?: string;
  compact?: boolean;
}) {
  // Sembunyikan seluruh bagian bila datanya benar-benar kosong.
  if (items.length === 0) return null;
  return (
    <section className={className}>
      <SectionHeading title={title} to={to} search={search} />
      <PosterGrid className={compact ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10" : "mx-auto max-w-6xl"}>
        {items.map(({ anime, imageUrl }) => (
          <Link key={anime.id} to="/anime/$slug" params={{ slug: anime.slug }} aria-label={anime.title}>
            <PosterCard
              title={anime.title}
              posterUrl={imageUrl}
              meta={`${typeLabel[anime.type]} • ${statusLabel[anime.status]}`}
              badge={badge ?? ""}
              aspect={POSTER_CARD_ASPECT}
            />
          </Link>
        ))}
      </PosterGrid>
    </section>
  );
}

function SectionHeading({ title, subtitle, className, to = "/anime", search, as: Heading = "h2" }: {
  title: string;
  subtitle?: string;
  className?: string;
  to?: "/anime" | "/terbaru";
  search?: { type?: string; status?: "ongoing" | "completed" } | undefined;
  as?: "h1" | "h2";
}) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 ${className ?? ""}`}>
      <div className="min-w-0">
        <Heading className="text-xl font-semibold">{title}</Heading>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <Link to={to} search={search ?? {}} className="shrink-0 pt-1 text-sm text-primary hover:underline">
        Lihat semua
      </Link>
    </div>
  );
}

