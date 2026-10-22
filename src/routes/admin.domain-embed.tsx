import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminSnapshotQuery } from "@/api/admin-queries";
import { addEmbedDomain, removeEmbedDomain } from "@/api/admin-site";
import { ResourceError } from "@/components/ResourceState";
import { adminHead } from "@/lib/admin-head";

export const Route = createFileRoute("/admin/domain-embed")({
  head: () => adminHead("Domain Embed"),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminSnapshotQuery),
  errorComponent: ResourceError,
  component: DomainAdmin,
});

function DomainAdmin() {
  const { data } = useSuspenseQuery(adminSnapshotQuery);
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await action(); await qc.invalidateQueries(); toast.success(ok); return true; }
    catch (e) { toast.error(e instanceof Error ? e.message : "Terjadi kesalahan."); return false; }
    finally { setBusy(false); }
  }
  async function add(e: FormEvent) { e.preventDefault(); if (await run(() => addEmbedDomain(value), "Domain ditambahkan.")) setValue(""); }
  return <section>
    <h1 className="text-3xl font-bold tracking-normal">Domain Embed</h1>
    <p className="mt-3 rounded-md border border-border bg-card p-4 text-sm">Hanya tambahkan sumber yang kamu punya hak untuk menayangkannya.</p>
    <form onSubmit={add} className="mt-6 flex flex-wrap gap-2">
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="player.contoh.com" aria-label="Nama domain" className="max-w-xs" required />
      <Button type="submit" disabled={busy}>Tambah</Button>
    </form>
    <div className="mt-8 divide-y divide-border border-y border-border">
      {data.allowedEmbedDomains.map((host) => <div key={host} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4">
        <span className="min-w-0 break-all font-medium">{host}</span>
        <Button variant="destructive" disabled={busy} onClick={() => { if (confirm(`Hapus domain ${host}?`)) run(() => removeEmbedDomain(host), "Domain dihapus."); }}>Hapus</Button>
      </div>)}
      {data.allowedEmbedDomains.length === 0 && <p className="py-8 text-muted-foreground">Belum ada domain.</p>}
    </div>
  </section>;
}
