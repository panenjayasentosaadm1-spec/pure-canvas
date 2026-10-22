import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { animeDetailQuery, episodesQuery, tagsQuery } from "@/api/queries";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { EpisodeList } from "@/components/EpisodeList";
import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { AnimeInfo } from "@/components/AnimeInfo";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { PageSkeleton } from "@/components/PageSkeleton";

export const Route = createFileRoute("/anime/$slug")({
  ssr: false,
  loader: async ({ context, params }) => {
    const anime = await context.queryClient.fetchQuery(animeDetailQuery(params.slug));
    if (!anime) throw notFound();
    await Promise.all([context.queryClient.fetchQuery(episodesQuery(anime.id)), context.queryClient.fetchQuery(tagsQuery)]);
    return anime;
  },
  head: ({ loaderData, match }) => {
    const missing = match.status === "notFound";
    const title = loaderData ? `${loaderData.title} - Sinopsis — UsagiNime` : missing ? "Anime tidak ditemukan — UsagiNime" : "Anime — UsagiNime";
    const description = loaderData?.synopsis ?? (missing ? "Anime ini tidak ada atau belum diterbitkan." : "Detail anime dan daftar episode di UsagiNime.");
    return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
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
  const firstEpisode = episodes.filter((episode) => episode.isPublished).reduce<(typeof episodes)[number] | undefined>((first, episode) => !first || episode.number < first.number ? episode : first, undefined);
  return <SiteLayout>
    <AnimeInfo key={anime.id} anime={anime} episodes={episodes} tags={tags} action={firstEpisode && <Button asChild><Link to="/anime/$slug/episode/$number" params={{ slug: anime.slug, number: String(firstEpisode.number) }}><Play />Tonton</Link></Button>} />
    <EpisodeList slug={anime.slug} episodes={episodes} posterUrl={anime.posterUrl} animeTitle={anime.title} />
  </SiteLayout>;
}