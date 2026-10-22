import { ResourceNotFound } from "@/components/ResourceState";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { adminSnapshotQuery } from "@/api/admin-queries";
import { EpisodeForm } from "@/components/admin/EpisodeForm";
import { adminHead } from "@/lib/admin-head";
export const Route = createFileRoute("/admin/episode/baru/$animeId")({
  loader: async ({ context, params }) => { const data = await context.queryClient.ensureQueryData(adminSnapshotQuery); if (!data.anime.some((anime) => anime.id === params.animeId)) throw notFound(); },
  head: () => adminHead("Tambah episode untuk anime", "Tambahkan nomor episode, thumbnail, dan sumber video anime di UsagiNime."), component: NewEpisode,
});
function NewEpisode() {
  const { animeId } = Route.useParams();
  const { data } = useSuspenseQuery(adminSnapshotQuery);
  const anime = data.anime.find((item) => item.id === animeId);
  if (!anime) return <ResourceNotFound />;
  return <EpisodeForm key={animeId} anime={anime} episodes={data.episodes} allowedDomains={data.allowedEmbedDomains} />;
}