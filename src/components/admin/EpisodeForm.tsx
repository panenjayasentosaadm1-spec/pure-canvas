import { useRef, useState, type FormEvent } from "react";
import { SafeImage } from "@/components/SafeImage";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Play } from "lucide-react";
import { toast } from "sonner";
import type { Anime, Episode } from "@/api/types";
import { saveEpisode } from "@/api/admin-episodes";
import { episodeInputSchema, nextEpisodeNumber, videoLinkError, type EpisodeInput } from "@/api/episode-validation";
import { cropThumbnail, THUMBNAIL_HINT } from "@/lib/thumbnail-upload";
import { describeCrop } from "@/lib/image-crop";
import { LIST_CARD_ASPECT } from "@/components/PosterCard";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function EpisodeForm({ anime, episode, episodes, allowedDomains }: { anime: Anime; episode?: Episode; episodes: Episode[]; allowedDomains: string[] }) {
  const [values, setValues] = useState<EpisodeInput>(() => ({ animeId: anime.id, number: episode?.number ?? nextEpisodeNumber(episodes, anime.id), title: episode?.title ?? "", embedUrl: episode?.embedUrl ?? "", thumbnailUrl: episode?.thumbnailUrl ?? "", isPublished: episode?.isPublished ?? false }));
  const [mode, setMode] = useState(episode?.thumbnailUrl && episode.thumbnailUrl !== anime.posterUrl ? "upload" : "poster");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EpisodeInput, string>>>({});
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [imageInfo, setImageInfo] = useState("");
  const skipWarning = useRef(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useBlocker({ shouldBlockFn: () => dirty && !skipWarning.current && !window.confirm("Perubahan belum disimpan. Tinggalkan halaman ini?"), enableBeforeUnload: dirty });

  function change<K extends keyof EpisodeInput>(key: K, value: EpisodeInput[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setDirty(true); skipWarning.current = false;
    setErrors((previous) => ({ ...previous, [key]: "" }));
    if (key === "embedUrl") setPreview("");
  }
  async function upload(file: File) {
    setImageBusy(true); setError("");
    try { const image = await cropThumbnail(file); change("thumbnailUrl", image.dataUrl); setImageInfo(describeCrop(image)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Gambar gagal diproses."); }
    finally { setImageBusy(false); }
  }
  function testVideo() {
    const link = values.embedUrl.trim();
    const message = videoLinkError(link, allowedDomains);
    setErrors((previous) => ({ ...previous, embedUrl: message ?? "" }));
    setPreview(message ? "" : link);
  }
  async function submit(published: boolean) {
    const candidate = { ...values, thumbnailUrl: mode === "poster" ? "" : values.thumbnailUrl, isPublished: published };
    const validation = episodeInputSchema.safeParse(candidate);
    const issues: Partial<Record<keyof EpisodeInput, string>> = validation.success ? {} : Object.fromEntries(validation.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
    const linkError = videoLinkError(candidate.embedUrl.trim(), allowedDomains);
    if (linkError) issues.embedUrl = linkError;
    if (episodes.some((item) => item.animeId === anime.id && item.number === candidate.number && item.id !== episode?.id)) issues.number = "Nomor episode sudah digunakan untuk anime ini.";
    if (mode === "upload" && !candidate.thumbnailUrl) issues.thumbnailUrl = "Unggah gambar thumbnail terlebih dahulu.";
    setErrors(issues);
    if (Object.keys(issues).length) { setError("Periksa kembali kolom yang ditandai."); return; }
    setBusy(true); setError("");
    try {
      const saved = await saveEpisode(candidate, episode?.id);
      skipWarning.current = true; setDirty(false); setValues({ ...saved });
      await queryClient.invalidateQueries();
      toast.success(published ? "Episode berhasil disimpan dan diterbitkan." : "Draf episode berhasil disimpan.", {
        duration: 12000,
        action: { label: "Tambah episode berikutnya", onClick: () => { void navigate({ to: "/admin/episode/baru/$animeId", params: { animeId: anime.id } }); } },
        cancel: { label: "Lihat di situs", onClick: () => {
          if (!saved.isPublished || !anime.isPublished) { toast.info("Episode belum tampil di situs. Terbitkan anime dan episode terlebih dahulu."); return; }
          void navigate({ to: "/anime/$slug/episode/$number", params: { slug: anime.slug, number: String(saved.number) } });
        } },
      });
      await navigate({ to: "/admin/episode/$id", params: { id: saved.id } });
    } catch (cause) { const message = cause instanceof Error ? cause.message : "Episode gagal disimpan."; setError(message); toast.error(message); }
    finally { setBusy(false); }
  }
  function onSubmit(event: FormEvent) { event.preventDefault(); void submit(true); }

  return <section className="max-w-4xl"><h1 className="text-3xl font-bold tracking-normal">{episode ? "Edit episode" : "Tambah episode"}</h1>
    <div className="my-6 flex items-center gap-4"><SafeImage src={anime.posterUrl} alt={anime.title} className="h-20 w-14 shrink-0 rounded-sm object-cover" /><div className="min-w-0"><h2 className="break-words text-lg font-semibold">{anime.title}</h2>{!episode && <Button asChild variant="link" className="h-auto px-0"><Link to="/admin/episode/baru">Ganti anime</Link></Button>}</div></div>
    <form onSubmit={onSubmit} noValidate className="space-y-6"><fieldset disabled={busy} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)]"><div className="space-y-2"><Label htmlFor="episode-number">Nomor episode</Label><Input id="episode-number" type="number" min={1} step={1} value={Number.isNaN(values.number) ? "" : values.number} aria-invalid={Boolean(errors.number)} onChange={(event) => change("number", event.target.value === "" ? NaN : Number(event.target.value))} />{errors.number && <p className="text-sm text-destructive">{errors.number}</p>}</div><div className="space-y-2"><Label htmlFor="episode-title">Judul episode (opsional)</Label><Input id="episode-title" value={values.title} onChange={(event) => change("title", event.target.value)} /></div></div>
      <div className="space-y-3"><Label>Gambar thumbnail</Label><RadioGroup value={mode} aria-label="Gambar thumbnail" onValueChange={(value) => { setMode(value); change("thumbnailUrl", values.thumbnailUrl ?? ""); }}><div className="flex items-center gap-2"><RadioGroupItem id="anime-poster" value="poster" /><Label htmlFor="anime-poster">Gunakan poster anime</Label></div><div className="flex items-center gap-2"><RadioGroupItem id="upload-thumbnail" value="upload" /><Label htmlFor="upload-thumbnail">Unggah gambar</Label></div></RadioGroup>
        {mode === "poster"
          ? <div className="flex items-center gap-3"><SafeImage src={anime.posterUrl} alt={`Poster ${anime.title}`} className="aspect-[2/3] w-16 shrink-0 rounded-sm border border-border object-cover object-center" /><p className="text-sm text-muted-foreground">Gambar kartu akan memakai poster anime</p></div>
          : <ImageUploadField id="episode-thumbnail" label="Gambar thumbnail" value={values.thumbnailUrl} hint={THUMBNAIL_HINT} info={imageInfo} error={errors.thumbnailUrl} busy={imageBusy} previewClassName={`${LIST_CARD_ASPECT} w-full max-w-xl`} onFile={(file) => { void upload(file); }} onRemove={() => { change("thumbnailUrl", ""); setImageInfo(""); setMode("poster"); }} />}
      </div>
      <div className="space-y-2"><Label htmlFor="episode-video">Link sumber video</Label><div className="flex flex-wrap gap-2"><Input id="episode-video" type="url" value={values.embedUrl} className="min-w-0 flex-1" aria-invalid={Boolean(errors.embedUrl)} onChange={(event) => change("embedUrl", event.target.value)} /><Button type="button" variant="outline" onClick={testVideo}><Play />Tes video</Button></div>{errors.embedUrl && <p className="text-sm text-destructive">{errors.embedUrl}</p>}</div>
      {preview && <iframe key={preview} src={preview} title="Pratinjau video episode" sandbox="allow-scripts allow-presentation" referrerPolicy="no-referrer" allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full rounded-md border border-border bg-card" />}
    </fieldset>{error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-3 border-t border-border pt-6"><Button type="button" variant="outline" disabled={busy || imageBusy} onClick={() => { void submit(false); }}><Save />Simpan sebagai draf</Button><Button type="submit" disabled={busy || imageBusy}>{busy ? "Menyimpan…" : episode?.isPublished ? "Perbarui" : "Terbitkan"}</Button></div>
    </form></section>;
}