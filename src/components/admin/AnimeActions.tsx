import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, ExternalLink } from "lucide-react";
import type { Anime } from "@/api/types";
import { deleteAnime, setAnimePublished } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";

export function AnimeActions({ anime, compact = false }: { anime: Anime; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const queryClient = useQueryClient();
  async function mutate(action: () => Promise<void>, message: string) {
    setBusy(true);
    try { await action(); setConfirm(false); await queryClient.invalidateQueries(); toast.success(message); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Perubahan gagal disimpan."); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center gap-1">
    <Button asChild size="sm" variant="ghost"><Link to="/admin/anime/$id" params={{ id: anime.id }}><Pencil />Edit</Link></Button>
    {!compact && <Button asChild size="sm" variant="ghost" title="Tambah episode"><Link aria-label={`Tambah episode ${anime.title}`} to="/admin/episode/baru/$animeId" params={{ animeId: anime.id }}><Plus /></Link></Button>}
    <Button size="sm" variant="outline" disabled={busy} onClick={() => { void mutate(() => setAnimePublished(anime.id, !anime.isPublished), anime.isPublished ? "Anime dijadikan draf." : "Anime diterbitkan."); }}>{anime.isPublished ? "Jadikan draf" : "Terbitkan"}</Button>
    {anime.isPublished ? <Button asChild size="sm" variant="ghost" title="Lihat di situs"><Link aria-label={`Lihat ${anime.title} di situs`} to="/anime/$slug" params={{ slug: anime.slug }}><ExternalLink />{compact && "Lihat di situs"}</Link></Button> : <Button size="sm" variant="ghost" disabled title="Draf belum tampil di situs"><ExternalLink />{compact && "Lihat di situs"}</Button>}
    {!compact && <Button size="sm" variant="ghost" disabled={busy} title="Hapus anime" aria-label={`Hapus ${anime.title}`} onClick={() => setConfirm(true)}><Trash2 className="text-destructive" /></Button>}
    <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogTitle>Hapus anime?</AlertDialogTitle><AlertDialogDescription>“{anime.title}” dan semua episodenya akan dihapus. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription><AlertDialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>Batal</Button><Button variant="destructive" disabled={busy} onClick={() => { void mutate(() => deleteAnime(anime.id), "Anime dan episodenya dihapus."); }}>{busy ? "Menghapus…" : "Hapus anime"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}