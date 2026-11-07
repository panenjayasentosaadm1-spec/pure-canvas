import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import type { Anime } from "@/api/types";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminSnapshotQuery } from "@/api/admin-queries";
import { nextEpisodeNumber } from "@/api/episode-validation";
import { createEpisodesBatch, MassEpisodeImportError, type MassEpisodeProblem } from "@/api/admin-episodes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResourceNotFound } from "@/components/ResourceState";
import { adminHead } from "@/lib/admin-head";
export const Route = createFileRoute("/admin/episode/massal/$animeId")({ staticData: { sitemap: false },
  loader: async ({ context, params }) => { const data = await context.queryClient.ensureQueryData(adminSnapshotQuery); if (!data.anime.some((anime) => anime.id === params.animeId)) throw notFound(); },
  head: () => adminHead("Tambah episode massal", "Tempel banyak link sumber video sekaligus untuk membuat episode di UsagiNime."), component: MassEpisode,
});
function MassEpisode() {
  const { animeId } = Route.useParams();
  const { data } = useSuspenseQuery(adminSnapshotQuery);
  const anime = data.anime.find((item) => item.id === animeId);
  if (!anime) return <ResourceNotFound />;
  return <MassEpisodeForm key={animeId} anime={anime} nextNumber={nextEpisodeNumber(data.episodes, animeId)} />;
}
function MassEpisodeForm({ anime, nextNumber }: { anime: Anime; nextNumber: number }) {
  const queryClient = useQueryClient();
  const [startNumber, setStartNumber] = useState(String(nextNumber));
  const [text, setText] = useState("");
  const [publishDirectly, setPublishDirectly] = useState(true);
  const [includeInLatest, setIncludeInLatest] = useState(true);
  const [problems, setProblems] = useState<MassEpisodeProblem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const start = Number(startNumber.trim());
  const startValid = Number.isInteger(start) && start >= 0;
  const overLimit = lines.length > 200;

  async function submit() {
    setError(null);
    setProblems(null);
    if (!startValid) { setError("Mulai dari nomor harus bilangan bulat 0 atau lebih."); return; }
    if (!lines.length) { setError("Tempel minimal satu link, satu per baris."); return; }
    if (overLimit) { setError("Maksimal 200 link dalam satu kali impor."); return; }
    setBusy(true);
    try {
      const count = await createEpisodesBatch({ animeId: anime.id, startNumber: start, lines, publishDirectly, includeInLatest });
      await queryClient.invalidateQueries();
      toast.success(`${count} episode ditambahkan`, { description: <Link to="/anime/$slug" params={{ slug: anime.slug }} className="underline">Lihat halaman anime</Link> });
      setText("");
      setProblems(null);
      setError(null);
      setStartNumber(String(start + count));
      setPublishDirectly(true);
      setIncludeInLatest(true);
    } catch (cause) {
      if (cause instanceof MassEpisodeImportError) setProblems(cause.problems);
      else setError(cause instanceof Error ? cause.message : "Gagal menyimpan episode.");
    } finally { setBusy(false); }
  }

  return <section className="max-w-3xl">
    <h1 className="text-3xl font-bold tracking-normal">Tambah episode massal</h1>
    <p className="mt-2 text-muted-foreground">{anime.title}</p>
    <div className="mt-6 space-y-5">
      <div>
        <label htmlFor="mass-start" className="text-sm font-medium">Mulai dari nomor</label>
        <Input id="mass-start" type="number" min={0} step={1} className="mt-1 w-32" value={startNumber} onChange={(event) => setStartNumber(event.target.value)} />
      </div>
      <div>
        <label htmlFor="mass-links" className="text-sm font-medium">Tempel link, satu per baris</label>
        <textarea id="mass-links" rows={12} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm" value={text} onChange={(event) => setText(event.target.value)} />
        <p className={`mt-1 text-sm ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>{lines.length ? `${lines.length} link, akan jadi episode ${startValid ? start : "?"} sampai ${startValid ? start + lines.length - 1 : "?"}` : "0 link"}</p>
        {overLimit && <p className="text-sm text-destructive">Maksimal 200 link dalam satu kali impor.</p>}
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={publishDirectly} onChange={(event) => setPublishDirectly(event.target.checked)} /> Terbitkan langsung</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-primary" checked={includeInLatest} onChange={(event) => setIncludeInLatest(event.target.checked)} /> Masukkan ke Anime Terbaru</label>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {problems && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <p className="font-medium">Tidak ada episode yang disimpan karena ada baris bermasalah:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {problems.map((problem) => <li key={`${problem.lineNumber}-${problem.message}`}>{`Baris ${problem.lineNumber}: ${problem.message}`}{problem.host && <> Tambahkan di <Link to="/admin/domain-embed" className="underline">halaman Domain Embed</Link>.</>}</li>)}
          </ul>
        </div>
      )}
      <Button onClick={() => { void submit(); }} disabled={busy}>{busy ? "Menyimpan…" : "Buat episode"}</Button>
    </div>
  </section>;
}
