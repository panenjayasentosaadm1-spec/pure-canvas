import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminSnapshotQuery } from "@/api/admin-queries";
import { createTag } from "@/api/admin";
import { deleteTag, renameTag } from "@/api/admin-site";
import { slugify } from "@/api/admin-validation";
import { ResourceError } from "@/components/ResourceState";
import { adminHead } from "@/lib/admin-head";

export const Route = createFileRoute("/admin/tag")({
  head: () => adminHead("Tag"),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminSnapshotQuery),
  errorComponent: ResourceError,
  component: TagAdmin,
});

function TagAdmin() {
  const { data } = useSuspenseQuery(adminSnapshotQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const usage = (id: string) => data.anime.filter((a) => a.tagIds.includes(id)).length;

  async function run(action: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await action(); await qc.invalidateQueries(); toast.success(ok); return true; }
    catch (e) { toast.error(e instanceof Error ? e.message : "Terjadi kesalahan."); return false; }
    finally { setBusy(false); }
  }
  async function add(e: FormEvent) { e.preventDefault(); if (await run(() => createTag(name), "Genre ditambahkan.")) setName(""); }

  return <section>
    <h1 className="text-3xl font-bold tracking-normal">Tag</h1>
    <form onSubmit={add} className="mt-6 flex flex-wrap gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama genre baru" aria-label="Nama genre baru" className="max-w-xs" required />
      <Button type="submit" disabled={busy}>Tambah</Button>
      {name && <p className="w-full text-sm text-muted-foreground">Slug: {slugify(name) || "-"}</p>}
    </form>
    <div className="mt-8 divide-y divide-border border-y border-border">
      {data.tags.map((tag) => <div key={tag.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
        {editing === tag.id
          ? <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (await run(() => renameTag(tag.id, editName), "Genre diubah.")) setEditing(null); }}>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Nama genre" required />
              <Button type="submit" disabled={busy}>Simpan</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
            </form>
          : <div><p className="font-semibold">{tag.name}</p><p className="text-sm text-muted-foreground">{tag.slug} · dipakai {usage(tag.id)} anime</p></div>}
        {editing !== tag.id && <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditing(tag.id); setEditName(tag.name); }}>Ubah nama</Button>
          <Button variant="destructive" disabled={busy} onClick={() => { if (confirm(`Hapus genre "${tag.name}"? Genre ini dipakai ${usage(tag.id)} anime dan akan dilepas dari semuanya.`)) run(() => deleteTag(tag.id), "Genre dihapus."); }}>Hapus</Button>
        </div>}
      </div>)}
      {data.tags.length === 0 && <p className="py-8 text-muted-foreground">Belum ada genre.</p>}
    </div>
  </section>;
}
