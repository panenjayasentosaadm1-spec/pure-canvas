import { ResourceNotFound } from "@/components/ResourceState";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { adminSnapshotQuery } from "@/api/admin-queries";
import { AnimeForm } from "@/components/admin/AnimeForm";
import { adminHead } from "@/lib/admin-head";
export const Route = createFileRoute("/admin/anime/$id")({ loader: async ({ context, params }) => { const data = await context.queryClient.ensureQueryData(adminSnapshotQuery); if (!data.anime.some((anime) => anime.id === params.id)) throw notFound(); }, head: () => adminHead("Edit anime"), component: EditAnime });
function EditAnime() { const { id } = Route.useParams(); const { data } = useSuspenseQuery(adminSnapshotQuery); const anime = data.anime.find((item) => item.id === id); if (!anime) return <ResourceNotFound />; return <AnimeForm key={id} anime={anime} tags={data.tags} />; }