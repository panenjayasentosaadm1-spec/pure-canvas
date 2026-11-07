import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { animeDetailQuery, episodesQuery, prefetchSiteChrome, tagsQuery } from "@/api/queries";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { EpisodeList } from "@/components/EpisodeList";
import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { AnimeInfo } from "@/components/AnimeInfo";
import { Button } from "@/components/ui/button";
import { canonicalHead } from "@/lib/head-meta";
import { Play } from "lucide-react";
import { PageSkeleton } from "@/components/PageSkeleton";
import { statusLabel } from "@/lib/format";

export const Route = createFileRoute("/anime/$slug")({
  staticData: { sitemap: true },
  loader: async ({ context, params }) => {
    const anime = await context.queryClient.fetchQuery(animeDetailQuery(params.slug));
    if (!anime) throw notFound();
    await Promise.all([
      context.queryClient.fetchQuery(episodesQuery(anime.id)),
      context.queryClient.fetchQuery(tagsQuery),
      prefetchSiteChrome(context.queryClient),
    ]);
    return anime;
  },
  head: ({ params, loaderData, match }) => {
    const missing = match.status === "notFound";
    const title = loaderData
      ? `${loaderData.title} Sub Indo — Sinopsis, Episode & Streaming | UsagiNime`
      : missing
        ? "Anime tidak ditemukan — UsagiNime"
        : "Anime Sub Indo — UsagiNime";
    const synopsis = loaderData?.synopsis.trim();
    const description = loaderData
      ? `${loaderData.title} subtitle Indonesia. ${synopsis ? `${synopsis.slice(0, 105).trimEnd()}${synopsis.length > 105 ? "…" : ""} ` : ""}Status: ${statusLabel[loaderData.status]}. Jelajahi sinopsis dan daftar episode di UsagiNime.`
      : missing
        ? "Anime ini tidak tersedia. Jelajahi katalog UsagiNime untuk menemukan judul anime lainnya."
        : "Jelajahi sinopsis, status tayang, dan daftar episode anime subtitle Indonesia di UsagiNime.";
    // Canonical hanya untuk halaman yang benar-benar ada; 404 tidak boleh
    // mengarah ke URL yang tidak ada.
    const canonical = loaderData ? canonicalHead(`/anime/${params.slug}`) : undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(canonical?.meta ?? []),
      ],
      links: [...(canonical?.links ?? [])],
    };
  },
  pendingComponent: () => <PageSkeleton variant="detail" />,
  errorComponent: ResourceError,
  notFoundComponent: ResourceNotFound,
  component: AnimeDetail,
});

function AnimeDetail() {
  const anime = Route.useLoaderData();
  const { data: episodes } = useSuspenseQuery(episodesQuery(anime.id));
  const { data: tags } = useSuspenseQuery(tagsQuery);
  const firstEpisode = episodes
    .filter((episode) => episode.isPublished)
    .sort((a, b) => {
      if (a.number !== null && b.number !== null) {
        return a.number - b.number;
      }
      if (a.number !== null) return -1;
      if (b.number !== null) return 1;
      return a.publishedAt.localeCompare(b.publishedAt);
    })[0];

  const watchButton = firstEpisode
    ? firstEpisode.specialLabel
      ? (
          <Button asChild>
            <Link
              to="/anime/$slug/episode-khusus/$episodeId"
              params={{ slug: anime.slug, episodeId: firstEpisode.id }}
            >
              <Play />
              Tonton
            </Link>
          </Button>
        )
      : firstEpisode.number !== null
        ? (
            <Button asChild>
              <Link
                to="/anime/$slug/episode/$number"
                params={{
                  slug: anime.slug,
                  number: String(firstEpisode.number),
                }}
              >
                <Play />
                Tonton
              </Link>
            </Button>
          )
        : undefined
    : undefined;

  return (
    <SiteLayout>
      <AnimeInfo
        key={anime.id}
        anime={anime}
        episodes={episodes}
        tags={tags}
        action={watchButton}
      />
      <EpisodeList
        slug={anime.slug}
        episodes={episodes}
        posterUrl={anime.posterUrl}
        animeTitle={anime.title}
      />
    </SiteLayout>
  );
}
