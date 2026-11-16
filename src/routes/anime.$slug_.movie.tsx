import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { animeDetailQuery, prefetchSiteChrome, tagsQuery } from "@/api/queries";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { AnimeInfo } from "@/components/AnimeInfo";
import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { canonicalHead } from "@/lib/head-meta";
import { Button } from "@/components/ui/button";
import { UniversalPlayer } from "@/components/player/UniversalPlayer";
import { PageSkeleton } from "@/components/PageSkeleton";
import { EpisodeHeader } from "@/components/episode/EpisodeHeader";
import { EpisodeComments } from "@/components/episode/EpisodeComments";

export const Route = createFileRoute("/anime/$slug_/movie")({
  staticData: { sitemap: true },
  loader: async ({ context, params }) => {
    const anime = await context.queryClient.fetchQuery(animeDetailQuery(params.slug));
    if (!anime || !anime.isPublished || anime.type !== "movie") throw notFound();
    await Promise.all([
      context.queryClient.fetchQuery(tagsQuery),
      prefetchSiteChrome(context.queryClient),
    ]);
    return anime;
  },
  head: ({ params, loaderData, match }) => {
    const missing = match.status === "notFound";
    const title = loaderData
      ? `Nonton ${loaderData.title} Movie Sub Indo | UsagiNime`
      : missing
        ? "Movie tidak ditemukan — UsagiNime"
        : "Nonton Movie Anime Sub Indo — UsagiNime";
    const synopsis = loaderData?.synopsis.trim();
    const description = loaderData
      ? `Nonton ${loaderData.title} movie subtitle Indonesia di UsagiNime.${synopsis ? ` ${synopsis.slice(0, 110).trimEnd()}${synopsis.length > 110 ? "…" : ""}` : ""}`
      : "Tonton movie anime subtitle Indonesia di UsagiNime.";
    const canonical = loaderData ? canonicalHead(`/anime/${params.slug}/movie`) : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "video.movie" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(canonical?.meta ?? []),
      ],
      links: [...(canonical?.links ?? [])],
    };
  },
  pendingComponent: () => <PageSkeleton variant="episode" />,
  errorComponent: ResourceError,
  notFoundComponent: ResourceNotFound,
  component: MoviePage,
});

function MoviePage() {
  const anime = Route.useLoaderData();
  const { data: tags } = useSuspenseQuery(tagsQuery);
  const embedUrl = anime.embedUrl?.trim() ?? "";

  return (
    <SiteLayout>
      <div style={playerVars} className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(18rem,3fr)]">
        <main className="min-w-0 lg:col-start-1 lg:row-start-1">
          <EpisodeHeader
            animeSlug={anime.slug}
            animeTitle={anime.title}
            episodeLabel="Movie"
            publishedAt={anime.createdAt}
          />
          <div className="mx-auto mt-5 w-full md:w-[min(100%,calc((100dvh_-_var(--ep-chrome))*16/9))]">
            {embedUrl ? (
              <UniversalPlayer embedUrl={embedUrl} title={`${anime.title} - Movie`} />
            ) : (
              <div role="status" className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-md border border-border bg-muted p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Video movie ini belum tersedia atau sedang disiapkan oleh admin.
                </p>
                <Button asChild variant="outline">
                  <Link to="/anime/$slug" params={{ slug: anime.slug }}>Kembali ke detail anime</Link>
                </Button>
              </div>
            )}
          </div>
          <div className="mt-5 min-w-0 border-t border-border/60 pt-4 lg:hidden">
            <AnimeInfo
              key={`${anime.id}-mobile`}
              anime={anime}
              episodes={[]}
              tags={tags}
              heading="h2"
              variant="compact"
              showTitle={false}
              showSynopsis={false}
            />
          </div>
        </main>
        <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:block lg:self-start">
          <AnimeInfo key={anime.id} anime={anime} episodes={[]} tags={tags} heading="h2" variant="compact" />
        </aside>
        <div className="min-w-0 border-t border-border/60 pt-5 lg:col-start-1 lg:row-start-2">
          <EpisodeComments animeId={anime.id} targetType="movie" allowComments={anime.allowComments ?? true} />
        </div>
      </div>
    </SiteLayout>
  );
}

const playerVars = {
  "--ep-header": "65px",
  "--ep-main-pad": "2rem",
  "--ep-title": "2rem",
  "--ep-controls": "0rem",
  "--ep-gaps": "2.5rem",
  "--ep-chrome":
    "calc(var(--ep-header) + var(--ep-main-pad) + var(--ep-title) + var(--ep-controls) + var(--ep-gaps))",
} as CSSProperties;
