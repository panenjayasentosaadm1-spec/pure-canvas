import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout, PageTitle } from "@/components/layout/SiteLayout";
import { POSTER_CARD_ASPECT, PosterCard, PosterGrid } from "@/components/PosterCard";
import { animeCardsQuery, prefetchSiteChrome, tagsQuery } from "@/api/queries";
import { PageSkeleton } from "@/components/PageSkeleton";
import { canonicalHead } from "@/lib/head-meta";
import { statusLabel, typeLabel } from "@/lib/format";


export const Route = createFileRoute("/genres")({
  staticData: { sitemap: true },
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.fetchQuery(tagsQuery),
      context.queryClient.fetchQuery(animeCardsQuery({})),
      prefetchSiteChrome(context.queryClient),
    ]),
  head: () => {
    const canonical = canonicalHead("/genres");
    return {
      meta: [
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { title: "Anime Berdasarkan Genre — Temukan Cerita Favoritmu | UsagiNime" },
        { name: "description", content: "Cari anime subtitle Indonesia berdasarkan genre. Jelajahi pilihan aksi, petualangan, komedi, drama, fantasi, dan cerita lainnya di UsagiNime." },
        { property: "og:title", content: "Anime Berdasarkan Genre — Temukan Cerita Favoritmu | UsagiNime" },
        { property: "og:description", content: "Cari anime subtitle Indonesia berdasarkan genre. Jelajahi pilihan aksi, petualangan, komedi, drama, fantasi, dan cerita lainnya di UsagiNime." },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
  pendingComponent: () => <PageSkeleton />,
  errorComponent: ResourceError,
  notFoundComponent: ResourceNotFound,
  component: GenresPage,
});

function GenresPage() {
  const { data: tags } = useSuspenseQuery(tagsQuery);
  const { data: anime } = useSuspenseQuery(animeCardsQuery({}));

  return (
    <SiteLayout>
      <PageTitle title="Genre" subtitle="Temukan anime berdasarkan genre favoritmu." />

      <div className="space-y-12">
        {tags.map((tag) => {
          const inTag = anime.filter(({ anime: a }) => a.tagIds.includes(tag.id));
          if (inTag.length === 0) return null;
          return (
            <section key={tag.id} id={tag.slug} className="scroll-mt-24">
              <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <h2 className="min-w-0 break-words text-xl font-semibold">
                  {tag.name} <span className="text-sm font-normal text-muted-foreground">({inTag.length} anime)</span>
                </h2>
                <Link to="/anime" search={{ genre: tag.slug }} className="text-sm text-primary hover:underline">
                  Lihat semua
                </Link>
              </div>
              <PosterGrid>
                {inTag.slice(0, 5).map(({ anime: a, imageUrl }) => (
                  <Link key={a.id} to="/anime/$slug" params={{ slug: a.slug }} aria-label={a.title}>
                    <PosterCard title={a.title} posterUrl={imageUrl} meta={`${typeLabel[a.type]} • ${statusLabel[a.status]}`} aspect={POSTER_CARD_ASPECT} />
                  </Link>
                ))}
              </PosterGrid>
            </section>
          );
        })}
      </div>
    </SiteLayout>
  );
}
