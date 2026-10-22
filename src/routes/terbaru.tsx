import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { latestEpisodesQuery } from "@/api/queries";
import { SiteLayout, PageTitle } from "@/components/layout/SiteLayout";
import { PosterGrid } from "@/components/PosterCard";
import { EpisodeCard } from "@/components/EpisodeCard";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { Button } from "@/components/ui/button";

const PER_PAGE = 30;

type TerbaruSearch = { page?: number | undefined };

function validateSearch(search: Record<string, unknown>): TerbaruSearch {
  const page = Number(search["page"]);
  return { page: Number.isInteger(page) && page > 1 ? page : undefined };
}

export const Route = createFileRoute("/terbaru")({
  ssr: false,
  validateSearch,
  loader: ({ context }) => context.queryClient.fetchQuery(latestEpisodesQuery),
  head: () => ({
    meta: [
      { title: "Episode Terbaru — UsagiNime" },
      { name: "description", content: "Daftar episode anime terbaru yang baru diterbitkan di UsagiNime." },
      { property: "og:title", content: "Episode Terbaru — UsagiNime" },
      { property: "og:description", content: "Daftar episode anime terbaru yang baru diterbitkan di UsagiNime." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: () => <PageSkeleton />,
  errorComponent: ResourceError,
  notFoundComponent: ResourceNotFound,
  component: TerbaruPage,
});

function TerbaruPage() {
  const { page: requested = 1 } = Route.useSearch();
  const { data: episodes } = useSuspenseQuery(latestEpisodesQuery);
  const totalPages = Math.max(1, Math.ceil(episodes.length / PER_PAGE));
  const page = Math.min(requested, totalPages);
  const items = episodes.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <SiteLayout>
      <PageTitle title="Episode Terbaru" subtitle="Episode yang paling baru diterbitkan, dari yang terbaru." />
      {items.length === 0 ? (
        <p className="text-muted-foreground">Belum ada episode terbaru.</p>
      ) : (
        <PosterGrid>
          {items.map((item) => <EpisodeCard key={item.id} item={item} />)}
        </PosterGrid>
      )}
      {totalPages > 1 && (
        <nav aria-label="Halaman" className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {page > 1 ? (
            <Button asChild variant="outline"><Link to="/terbaru" search={{ page: page - 1 > 1 ? page - 1 : undefined }}><ArrowLeft />Sebelumnya</Link></Button>
          ) : (
            <Button variant="outline" disabled><ArrowLeft />Sebelumnya</Button>
          )}
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
            <Button key={number} asChild variant={number === page ? "default" : "outline"} size="icon">
              <Link to="/terbaru" search={{ page: number > 1 ? number : undefined }} aria-label={`Halaman ${number}`} aria-current={number === page ? "page" : undefined}>{number}</Link>
            </Button>
          ))}
          {page < totalPages ? (
            <Button asChild variant="outline"><Link to="/terbaru" search={{ page: page + 1 }}>Berikutnya<ArrowRight /></Link></Button>
          ) : (
            <Button variant="outline" disabled>Berikutnya<ArrowRight /></Button>
          )}
        </nav>
      )}
    </SiteLayout>
  );
}
