import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Eye, EyeOff, Trash2 } from "lucide-react";
import { adminListComments, deleteComment, setCommentHidden, type AdminComment } from "@/api/comments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { ResourceError } from "@/components/ResourceState";
import { adminHead } from "@/lib/admin-head";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

const adminCommentsQuery = queryOptions({ queryKey: ["admin", "comments"], queryFn: adminListComments });

export const Route = createFileRoute("/admin/komentar")({
  staticData: { sitemap: false },
  head: () => adminHead("Komentar", "Kelola komentar episode UsagiNime."),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminCommentsQuery),
  errorComponent: ResourceError,
  component: CommentAdmin,
});

function CommentAdmin() {
  const { data: comments } = useSuspenseQuery(adminCommentsQuery);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [animeId, setAnimeId] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "hidden">("all");
  const [targetType, setTargetType] = useState<"all" | "episode" | "movie">("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminComment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const animeOptions = useMemo(() => {
    const anime = new Map<string, string>();
    comments.forEach((comment) => anime.set(comment.animeId, comment.animeTitle));
    return [...anime.entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
  }, [comments]);

  const items = comments.filter((comment) => {
    const term = search.trim().toLocaleLowerCase("id");
    const matchesSearch = !term || comment.authorName.toLocaleLowerCase("id").includes(term) || comment.content.toLocaleLowerCase("id").includes(term);
    const matchesStatus = status === "all" || (status === "hidden" ? comment.status === "hidden" : comment.status !== "hidden");
    return matchesSearch && (!animeId || comment.animeId === animeId) && matchesStatus && (targetType === "all" || comment.targetType === targetType);
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function update(action: () => Promise<void>, successMessage: string, id: string) {
    setBusyId(id);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: adminCommentsQuery.queryKey });
      toast.success(successMessage);
      return true;
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Perubahan gagal disimpan.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function permanentlyDelete() {
    if (!deleteTarget) return;
    const deleted = await update(() => deleteComment(deleteTarget.id), "Komentar dihapus permanen.", deleteTarget.id);
    if (deleted) setDeleteTarget(null);
  }

  const selectClass = "h-10 max-w-full rounded-md border border-input bg-background px-3 text-sm";

  return <section className="min-w-0">
    <h1 className="text-3xl font-bold tracking-normal">Komentar</h1>
    <div className="my-6 flex flex-wrap gap-3">
      <div className="relative min-w-48 flex-1">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input aria-label="Cari penulis atau komentar" placeholder="Cari penulis atau komentar" className="h-10 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <select aria-label="Filter anime" className={selectClass} value={animeId} onChange={(event) => setAnimeId(event.target.value)}>
        <option value="">Semua anime</option>
        {animeOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
      </select>
      <select aria-label="Filter tipe" className={selectClass} value={targetType} onChange={(event) => setTargetType(event.target.value as typeof targetType)}>
        <option value="all">Semua</option>
        <option value="episode">Episode TV</option>
        <option value="movie">Movie</option>
      </select>
      <select aria-label="Filter status" className={selectClass} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
        <option value="all">Semua status</option>
        <option value="active">Aktif</option>
        <option value="hidden">Disembunyikan</option>
      </select>
    </div>

    <div className="min-w-0 max-w-full overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-card text-muted-foreground"><tr>{["Komentar", "Anime / Episode", "Status", "Tanggal", "Tindakan"].map((label) => <th key={label} className="px-4 py-4 font-medium">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">
          {items.map((comment) => {
            const hidden = comment.status === "hidden";
            const busy = busyId === comment.id;
            return <tr key={comment.id}>
              <td className="max-w-[440px] px-4 py-4 align-top">
                <p className="font-semibold">{comment.authorName}</p>
                {comment.email && <p className="mt-0.5 text-xs text-muted-foreground">{comment.email}</p>}
                <p className="mt-2 whitespace-pre-wrap break-words">{comment.content}</p>
              </td>
              <td className="max-w-56 px-4 py-4 align-top"><p className="font-semibold">{comment.animeTitle}</p><p className="mt-1 text-muted-foreground">{comment.episodeLabel}</p></td>
              <td className="px-4 py-4 align-top"><span className={`rounded-sm px-2 py-1 text-xs ${hidden ? "bg-muted text-muted-foreground" : "bg-accent text-primary"}`}>{hidden ? "Disembunyikan" : "Aktif"}</span></td>
              <td className="whitespace-nowrap px-4 py-4 align-top">{formatDate(comment.createdAt)}</td>
              <td className="px-4 py-4 align-top"><div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => { void update(() => setCommentHidden(comment.id, !hidden), hidden ? "Komentar ditampilkan kembali." : "Komentar disembunyikan.", comment.id); }}>
                  {hidden ? <Eye /> : <EyeOff />}{hidden ? "Tampilkan" : "Sembunyikan"}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} aria-label={`Hapus permanen komentar dari ${comment.authorName}`} onClick={() => setDeleteTarget(comment)}><Trash2 className="text-destructive" />Hapus</Button>
              </div></td>
            </tr>;
          })}
        </tbody>
      </table>
      {items.length === 0 && <p className="p-10 text-center text-muted-foreground">Tidak ada komentar yang cocok.</p>}
    </div>

    <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && busyId === null) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogTitle>Hapus komentar permanen?</AlertDialogTitle>
        <AlertDialogDescription>{deleteTarget ? `Komentar dari ${deleteTarget.authorName} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.` : "Komentar akan dihapus permanen."}</AlertDialogDescription>
        <AlertDialogFooter>
          <Button variant="outline" disabled={busyId !== null} onClick={() => setDeleteTarget(null)}>Batal</Button>
          <Button variant="destructive" disabled={busyId !== null} onClick={() => { void permanentlyDelete(); }}>{busyId === deleteTarget?.id ? "Menghapus…" : "Hapus permanen"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}