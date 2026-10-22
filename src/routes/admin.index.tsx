import { SafeImage } from "@/components/SafeImage";
import { LIST_CARD_ASPECT } from "@/components/PosterCard";
import { getListImage } from "@/api/list-image";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Film, PlaySquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminCounts } from "@/api/admin";
import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { adminSnapshotQuery } from "@/api/admin-queries";
import { AnimeActions } from "@/components/admin/AnimeActions";
import { formatDate } from "@/lib/format";

const countsQuery = queryOptions({ queryKey: ["admin", "counts"], queryFn: getAdminCounts });
export const Route = createFileRoute("/admin/")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(countsQuery), context.queryClient.ensureQueryData(adminSnapshotQuery)]),
  errorComponent: ResourceError,
  notFoundComponent: ResourceNotFound,
  head: () => ({ meta: [
    { title: "Dasbor - Admin UsagiNime" },
    { name: "description", content: "Ringkasan katalog demo UsagiNime." },
    { property: "og:title", content: "Dasbor - Admin UsagiNime" },
    { property: "og:description", content: "Ringkasan katalog demo UsagiNime." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminDashboard,
});
function AdminDashboard() {
  const { data: counts } = useSuspenseQuery(countsQuery);
  const { data } = useSuspenseQuery(adminSnapshotQuery);
  const latest = [...data.anime].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  return <section><p className="text-sm font-medium text-primary">DASBOR</p><h1 className="mt-2 text-3xl font-bold tracking-normal">Selamat datang, admin</h1>
    <div className="mt-7 grid gap-3 sm:grid-cols-2"><Button asChild size="lg" className="h-16 text-base"><Link to="/admin/anime/baru"><Plus />Tambah Anime</Link></Button><Button asChild size="lg" className="h-16 text-base"><Link to="/admin/episode/baru"><Plus />Tambah Episode</Link></Button></div>
    <dl className="mt-7 grid grid-cols-3 gap-3">{[{ label: "Anime", value: counts.anime, icon: Film }, { label: "Episode", value: counts.episodes, icon: PlaySquare }, { label: "Draf", value: counts.drafts, icon: FileText }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-md border border-border bg-card p-4 sm:p-6"><Icon className="mb-4 size-5 text-primary" /><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 text-3xl font-bold">{value}</dd></div>)}</dl>
    <h2 className="mb-4 mt-10 text-xl font-semibold tracking-normal">Terakhir diubah</h2><div className="divide-y divide-border border-y border-border">{latest.map((anime) => <div key={anime.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="flex min-w-0 items-center gap-3"><SafeImage src={getListImage(anime)} alt={anime.title} className={`${LIST_CARD_ASPECT} w-24 shrink-0 rounded-sm object-cover object-center`} /><div className="min-w-0"><p className="break-words font-semibold">{anime.title}</p><p className="mt-1 text-sm text-muted-foreground">{formatDate(anime.updatedAt)} · {anime.isPublished ? "Terbit" : "Draf"}</p></div></div><AnimeActions anime={anime} compact /></div>)}{latest.length === 0 && <p className="py-8 text-muted-foreground">Belum ada anime.</p>}</div>
  </section>;
}
