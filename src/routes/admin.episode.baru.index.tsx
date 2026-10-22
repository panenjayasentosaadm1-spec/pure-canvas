import { createFileRoute, Link } from "@tanstack/react-router";
import { SafeImage } from "@/components/SafeImage";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { adminSnapshotQuery } from "@/api/admin-queries";
import { nextEpisodeNumber } from "@/api/episode-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { statusLabel } from "@/lib/format";
import { adminHead } from "@/lib/admin-head";
export const Route = createFileRoute("/admin/episode/baru/")({ loader: ({ context }) => context.queryClient.ensureQueryData(adminSnapshotQuery), head: () => adminHead("Pilih anime", "Pilih anime untuk menambahkan episode di UsagiNime."), component: ChooseAnime });
function ChooseAnime() {
  const { data } = useSuspenseQuery(adminSnapshotQuery);
  const [query, setQuery] = useState("");
  const items = data.anime.filter((anime) => anime.title.toLocaleLowerCase("id").includes(query.trim().toLocaleLowerCase("id")));
  return <section className="max-w-4xl"><h1 className="text-3xl font-bold tracking-normal">Pilih anime</h1><div className="relative my-6"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Cari judul anime" placeholder="Cari judul anime" className="h-10 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <ul className="divide-y divide-border">{items.map((anime) => {
      const latest = nextEpisodeNumber(data.episodes, anime.id) - 1;
      return <li key={anime.id}><Button asChild variant="ghost" className="h-auto w-full justify-start gap-4 whitespace-normal rounded-none px-2 py-4"><Link to="/admin/episode/baru/$animeId" params={{ animeId: anime.id }}><SafeImage src={anime.posterUrl} alt={anime.title} className="h-20 w-14 shrink-0 rounded-sm object-cover" /><div className="min-w-0 flex-1 text-left"><h2 className="break-words font-semibold">{anime.title}</h2><p className="mt-1 text-sm font-normal text-muted-foreground">{statusLabel[anime.status]} · {anime.isPublished ? "Terbit" : "Draf"}</p><p className="mt-1 text-sm font-normal text-muted-foreground">{latest ? `Episode terakhir: ${latest}` : "Belum ada episode"}</p></div><ArrowRight className="shrink-0" /></Link></Button></li>;
    })}</ul>{!items.length && <p className="py-10 text-center text-muted-foreground">Tidak ada anime yang cocok.</p>}
  </section>;
}