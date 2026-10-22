import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminSnapshotQuery } from "@/api/admin-queries";
import { resetSampleData, saveSettings } from "@/api/admin-site";
import { LOGO_HINT, scaleLogo } from "@/lib/logo-upload";
import { describeCrop } from "@/lib/image-crop";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { ResourceError } from "@/components/ResourceState";
import { adminHead } from "@/lib/admin-head";

export const Route = createFileRoute("/admin/pengaturan")({
  head: () => adminHead("Pengaturan"),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminSnapshotQuery),
  errorComponent: ResourceError,
  component: SettingsAdmin,
});

function SettingsAdmin() {
  const { data } = useSuspenseQuery(adminSnapshotQuery);
  const qc = useQueryClient();
  const [form, setForm] = useState(data.settings);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoInfo, setLogoInfo] = useState("");

  async function run(action: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await action(); await qc.invalidateQueries(); toast.success(ok); return true; }
    catch (e) { toast.error(e instanceof Error ? e.message : "Terjadi kesalahan."); return false; }
    finally { setBusy(false); }
  }
  async function onLogo(file: File) {
    setLogoBusy(true);
    try { const image = await scaleLogo(file); setForm((f) => ({ ...f, logoUrl: image.dataUrl })); setLogoInfo(describeCrop(image)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Logo gagal diproses."); }
    finally { setLogoBusy(false); }
  }
  async function submit(e: FormEvent) { e.preventDefault(); await run(() => saveSettings(form), "Pengaturan disimpan."); }
  async function reset() {
    if (!confirm("Pulihkan semua data contoh? Semua perubahan anime, episode, genre, domain, dan pengaturan akan hilang.")) return;
    if (await run(resetSampleData, "Data contoh dipulihkan.")) {
      const fresh = await qc.fetchQuery(adminSnapshotQuery);
      setForm(fresh.settings);
      setLogoInfo("");
    }
  }

  return <section className="max-w-2xl">
    <h1 className="text-3xl font-bold tracking-normal">Pengaturan</h1>
    <form onSubmit={submit} className="mt-6 space-y-5">
      <div className="space-y-2"><Label htmlFor="siteName">Nama situs</Label><Input id="siteName" required value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="tagline">Tagline</Label><Input id="tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></div>
      <div className="space-y-2"><Label htmlFor="logo">Logo</Label>
        <ImageUploadField id="logo" label="Logo" value={form.logoUrl} hint={LOGO_HINT} info={logoInfo} busy={logoBusy} previewClassName="h-20 w-40 p-2" imageClassName="object-contain" onFile={(file) => { void onLogo(file); }} onRemove={() => { setForm((f) => ({ ...f, logoUrl: null })); setLogoInfo(""); }} />
      </div>
      <div className="space-y-2"><Label htmlFor="footer">Teks footer</Label><Input id="footer" value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} /></div>
      <Button type="submit" disabled={busy || logoBusy}>{busy ? "Menyimpan…" : "Simpan"}</Button>
    </form>
    <div className="mt-12 border-t border-border pt-6">
      <h2 className="text-xl font-semibold">Data contoh</h2>
      <p className="mt-2 text-sm text-muted-foreground">Mengembalikan seluruh data ke kondisi awal.</p>
      <Button variant="destructive" className="mt-4" disabled={busy} onClick={reset}>Reset data contoh</Button>
    </div>
  </section>;
}
