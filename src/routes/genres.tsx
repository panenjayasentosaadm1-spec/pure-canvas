import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout, PageTitle } from "@/components/layout/SiteLayout";
import { PosterCard, PosterGrid } from "@/components/PosterCard";
import { animeCardsQuery, tagsQuery } from "@/api/queries";
import { PageSkeleton } from "@/components/PageSkeleton";
import { statusLabel, typeLabel } from "@/lib/format";

export const Route = createFileRoute("/genres")({
  ssr: false,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.fetchQuery(tagsQuery),
      context.queryClient.fetchQuery(animeCardsQuery({})),
    ]),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Genre — UsagiNime" },
      { name: "description", content: "Jelajahi anime berdasarkan genre di UsagiNime." },
      { property: "og:title", content: "Genre — UsagiNime" },
      { property: "og:description", content: "Jelajahi anime berdasarkan genre di UsagiNime." },
    ],
  }),
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
                    <PosterCard title={a.title} posterUrl={imageUrl} meta={`${typeLabel[a.type]} • ${statusLabel[a.status]}`} />
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
