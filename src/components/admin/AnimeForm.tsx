import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
import { createTag, saveAnime } from "@/api/admin";
import { animeInputSchema, slugify, type AnimeInput } from "@/api/admin-validation";
import type { Anime, Tag } from "@/api/types";
import { cropPoster, POSTER_HINT } from "@/lib/poster-upload";
import { describeCrop } from "@/lib/image-crop";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { statusLabel, typeLabel, seasonLabel } from "@/lib/format";

function Field({ label, id, children, error }: { label: string; id: string; children: ReactNode; error?: string | undefined }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{children}{error && <p className="text-sm text-destructive">{error}</p>}</div>;
}

export function AnimeForm({ anime, tags: initialTags }: { anime?: Anime; tags: Tag[] }) {
  const [values, setValues] = useState<AnimeInput>(() => anime ? { ...anime } : { title: "", altTitle: "", slug: "", synopsis: "", posterUrl: "", studio: "", type: "tv", status: "ongoing", season: "", year: new Date().getFullYear(), tagIds: [], isPublished: false });
  const [tags, setTags] = useState(initialTags);
  const [newTag, setNewTag] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof AnimeInput, string>>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageInfo, setImageInfo] = useState("");
  const [tagBusy, setTagBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const slugEdited = useRef(Boolean(anime));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const skipWarning = useRef(false);
  useBlocker({ shouldBlockFn: () => dirty && !skipWarning.current && !window.confirm("Perubahan belum disimpan. Tinggalkan halaman ini?"), enableBeforeUnload: dirty });
  useEffect(() => { skipWarning.current = false; }, []);

  function change<K extends keyof AnimeInput>(key: K, value: AnimeInput[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
    setErrors((previous) => ({ ...previous, [key]: "" }));
  }
  function titleChanged(title: string) {
    setValues((previous) => ({ ...previous, title, slug: slugEdited.current ? previous.slug : slugify(title) }));
    setDirty(true);
  }
  async function upload(file: File) {
    setImageBusy(true); setError("");
    try { const image = await cropPoster(file); change("posterUrl", image.dataUrl); setImageInfo(describeCrop(image)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Gambar gagal diproses."); }
    finally { setImageBusy(false); }
  }
  async function addTag() {
    setTagBusy(true); setError("");
    try {
      const tag = await createTag(newTag);
      setTags((previous) => [...previous, tag]);
      change("tagIds", [...values.tagIds, tag.id]);
      setNewTag("");
      await queryClient.invalidateQueries({ queryKey: ["tags"] });
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Genre berhasil dibuat.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Genre gagal dibuat."); }
    finally { setTagBusy(false); }
  }
  async function submit(published: boolean) {
    const candidate = { ...values, isPublished: published };
    const validation = animeInputSchema.safeParse(candidate);
    if (!validation.success) {
      setErrors(Object.fromEntries(validation.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      setError("Periksa kembali kolom yang ditandai.");
      return;
    }
    setBusy(true); setError("");
    try {
      const saved = await saveAnime(candidate, anime?.id);
      skipWarning.current = true; setDirty(false);
      await queryClient.invalidateQueries();
      toast.success(published ? "Anime berhasil diterbitkan." : "Draf berhasil disimpan.", !anime ? { action: { label: "Tambah episode", onClick: () => { void navigate({ to: "/admin/episode/baru/$animeId", params: { animeId: saved.id } }); } } } : undefined);
      await navigate({ to: "/admin/anime" });
    } catch (cause) { const message = cause instanceof Error ? cause.message : "Anime gagal disimpan."; setError(message); toast.error(message); }
    finally { setBusy(false); }
  }
  const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring";
  const optionalNumber = (value: string) => value === "" ? undefined : Number(value);
  function onSubmit(event: FormEvent) { event.preventDefault(); void submit(true); }

  return <section className="max-w-5xl"><h1 className="text-3xl font-bold tracking-normal">{anime ? "Edit anime" : "Tambah anime"}</h1><form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
    <fieldset disabled={busy} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="space-y-5">
        <Field label="Judul" id="title" error={errors.title}><Input id="title" value={values.title} onChange={(event) => titleChanged(event.target.value)} aria-invalid={Boolean(errors.title)} /></Field>
        <Field label="Judul alternatif" id="altTitle"><Input id="altTitle" value={values.altTitle ?? ""} onChange={(event) => change("altTitle", event.target.value)} /></Field>
        <Field label="Sinopsis" id="synopsis"><Textarea id="synopsis" rows={7} value={values.synopsis} onChange={(event) => change("synopsis", event.target.value)} /></Field>
        <Field label="Slug" id="slug" error={errors.slug}><Input id="slug" value={values.slug} onChange={(event) => { slugEdited.current = true; change("slug", event.target.value); }} /></Field>
      </div>
      <div className="space-y-2"><Label htmlFor="poster">Poster</Label><ImageUploadField id="poster" label="Poster" value={values.posterUrl} hint={POSTER_HINT} info={imageInfo} error={errors.posterUrl} busy={imageBusy} previewClassName="aspect-[2/3]" buttonsClassName="flex-col [&>button]:w-full" onFile={(file) => { void upload(file); }} onRemove={() => { change("posterUrl", ""); setImageInfo(""); }} /></div>
    </fieldset>
    <fieldset disabled={busy} className="grid gap-5 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Studio" id="studio"><Input id="studio" value={values.studio ?? ""} onChange={(event) => change("studio", event.target.value)} /></Field>
      <Field label="Rating (0–10)" id="rating" error={errors.rating}><Input id="rating" type="number" min={0} max={10} step="0.1" value={values.rating ?? ""} onChange={(event) => change("rating", optionalNumber(event.target.value))} /></Field>
      <Field label="Tipe" id="type"><select id="type" className={selectClass} value={values.type} onChange={(event) => change("type", event.target.value as AnimeInput["type"])}>{Object.entries(typeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Status" id="status"><select id="status" className={selectClass} value={values.status} onChange={(event) => change("status", event.target.value as AnimeInput["status"])}>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Musim" id="season"><select id="season" className={selectClass} value={values.season} onChange={(event) => change("season", event.target.value)}><option value="">Belum ditentukan</option>{Object.entries(seasonLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Tahun" id="year" error={errors.year}><Input id="year" type="number" value={values.year} onChange={(event) => change("year", Number(event.target.value))} /></Field>
      <Field label="Durasi per episode (menit)" id="durationMinutes" error={errors.durationMinutes}><Input id="durationMinutes" type="number" min={1} value={values.durationMinutes ?? ""} onChange={(event) => change("durationMinutes", optionalNumber(event.target.value))} /></Field>
      <Field label="Total episode" id="totalEpisodes" error={errors.totalEpisodes}><Input id="totalEpisodes" type="number" min={1} value={values.totalEpisodes ?? ""} onChange={(event) => change("totalEpisodes", optionalNumber(event.target.value))} /></Field>
    </fieldset>
    <fieldset disabled={busy} className="space-y-4 border-t border-border pt-6"><legend className="pt-6 font-semibold">Genre / tag</legend><div className="flex flex-wrap gap-4">{tags.map((tag) => <label key={tag.id} className="flex items-center gap-2 text-sm"><Checkbox checked={values.tagIds.includes(tag.id)} onCheckedChange={(checked) => change("tagIds", checked === true ? [...values.tagIds, tag.id] : values.tagIds.filter((id) => id !== tag.id))} />{tag.name}</label>)}</div><div className="flex flex-wrap items-end gap-2"><div className="min-w-0 flex-1 space-y-2"><Label htmlFor="new-tag">Buat tag baru</Label><Input id="new-tag" value={newTag} onChange={(event) => setNewTag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addTag(); } }} /></div><Button type="button" variant="outline" disabled={tagBusy || !newTag.trim()} onClick={() => { void addTag(); }}><Plus />{tagBusy ? "Membuat…" : "Buat tag"}</Button></div></fieldset>
    {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-3 border-t border-border pt-6"><Button type="button" variant="outline" disabled={busy || imageBusy || tagBusy} onClick={() => { void submit(false); }}><Save />Simpan sebagai draf</Button><Button type="submit" disabled={busy || imageBusy || tagBusy}>{busy ? "Menyimpan…" : anime?.isPublished ? "Perbarui" : "Terbitkan"}</Button></div>
  </form></section>;
}