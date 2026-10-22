import { ResourceNotFound } from "@/components/ResourceState";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { adminSnapshotQuery } from "@/api/admin-queries";
import { EpisodeForm } from "@/components/admin/EpisodeForm";
import { adminHead } from "@/lib/admin-head";

export const Route = createFileRoute("/admin/episode/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(adminSnapshotQuery);
    const episode = data.episodes.find((item) => item.id === params.id);
    if (!episode || !data.anime.some((anime) => anime.id === episode.animeId)) throw notFound();
  },
  head: () => adminHead("Edit episode", "Perbarui episode dan status publikasi anime UsagiNime."), component: EditEpisode,
});
function EditEpisode() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(adminSnapshotQuery);
  const episode = data.episodes.find((item) => item.id === id);
  const anime = data.anime.find((item) => item.id === episode?.animeId);
  if (!episode || !anime) return <ResourceNotFound />;
  return <EpisodeForm key={id} anime={anime} episode={episode} episodes={data.episodes} allowedDomains={data.allowedEmbedDomains} />;
}