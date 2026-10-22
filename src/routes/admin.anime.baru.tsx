import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { adminSnapshotQuery } from "@/api/admin-queries";
import { AnimeForm } from "@/components/admin/AnimeForm";
import { adminHead } from "@/lib/admin-head";
export const Route = createFileRoute("/admin/anime/baru")({ loader: ({ context }) => context.queryClient.ensureQueryData(adminSnapshotQuery), head: () => adminHead("Tambah anime"), component: NewAnime });
function NewAnime() { const { data } = useSuspenseQuery(adminSnapshotQuery); return <AnimeForm tags={data.tags} />; }