import { createFileRoute, Link } from "@tanstack/react-router";
import { SafeImage } from "@/components/SafeImage";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { adminSnapshotQuery } from "@/api/admin-queries";
import { EpisodeActions } from "@/components/admin/EpisodeActions";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { adminHead } from "@/lib/admin-head";
export const Route = createFileRoute("/admin/episode/")({ loader: ({ context }) => context.queryClient.ensureQueryData(adminSnapshotQuery), head: () => adminHead("Daftar episode", "Kelola episode anime, draf, dan publikasi UsagiNime."), component: EpisodeList });
function EpisodeList() {
  const { data } = useSuspenseQuery(adminSnapshotQuery);
  const [animeId, setAnimeId] = useState("");
  const [published, setPublished] = useState("");
  const animeById = new Map(data.anime.map((anime) => [anime.id, anime]));
  const items = data.episodes.filter((episode) => (!animeId || episode.animeId === animeId) && (!published || episode.isPublished === (published === "yes"))).sort((a, b) => (b.updatedAt || b.publishedAt).localeCompare(a.updatedAt || a.publishedAt) || b.number - a.number);
  const selectClass = "h-10 max-w-full rounded-md border border-input bg-background px-3 text-sm";
  return <section><div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-bold tracking-normal">Episode</h1><Button asChild><Link to="/admin/episode/baru"><Plus />Tambah Episode</Link></Button></div>
    <div className="my-6 flex flex-wrap gap-3"><select aria-label="Filter anime" className={selectClass} value={animeId} onChange={(event) => setAnimeId(event.target.value)}><option value="">Semua anime</option>{data.anime.map((anime) => <option key={anime.id} value={anime.id}>{anime.title}</option>)}</select><select aria-label="Filter publikasi" className={selectClass} value={published} onChange={(event) => setPublished(event.target.value)}><option value="">Semua publikasi</option><option value="yes">Terbit</option><option value="no">Draf</option></select></div>
    <div className="min-w-0 max-w-full overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-card text-muted-foreground"><tr>{["Thumbnail", "Anime", "Nomor", "Judul episode", "Publikasi", "Tanggal", "Tindakan"].map((label) => <th key={label} className="px-4 py-4 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{items.map((episode) => {
      const anime = animeById.get(episode.animeId);
      const thumbnail = episode.thumbnailUrl || anime?.posterUrl;
      const date = episode.publishedAt || episode.updatedAt;
      return <tr key={episode.id}><td className="px-4 py-3"><SafeImage src={thumbnail} alt={`${anime?.title ?? "Anime"} episode ${episode.number}`} className="aspect-video w-24 rounded-sm object-cover" /></td><td className="max-w-56 px-4 font-semibold">{anime?.title ?? "Anime tidak ditemukan"}</td><td className="px-4">{episode.number}</td><td className="max-w-56 px-4">{episode.title || "—"}</td><td className="px-4"><span className={`rounded-sm px-2 py-1 text-xs ${episode.isPublished ? "bg-accent text-primary" : "bg-muted text-muted-foreground"}`}>{episode.isPublished ? "Terbit" : "Draf"}</span></td><td className="whitespace-nowrap px-4">{date ? formatDate(date) : "—"}</td><td className="px-4"><EpisodeActions episode={episode} animeTitle={anime?.title ?? "Anime tidak ditemukan"} /></td></tr>;
    })}</tbody></table>{!items.length && <p className="p-10 text-center text-muted-foreground">Tidak ada episode yang cocok.</p>}</div>
  </section>;
}