import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteEpisode } from "@/api/admin-episodes";
import type { Episode } from "@/api/types";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";

export function EpisodeActions({ episode, animeTitle }: { episode: Episode; animeTitle: string }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  async function remove() {
    setBusy(true);
    try { await deleteEpisode(episode.id); setConfirm(false); await queryClient.invalidateQueries(); toast.success("Episode berhasil dihapus."); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Episode gagal dihapus."); }
    finally { setBusy(false); }
  }
  return <div className="flex items-center gap-1"><Button asChild size="sm" variant="ghost"><Link to="/admin/episode/$id" params={{ id: episode.id }}><Pencil />Edit</Link></Button><Button size="sm" variant="ghost" title="Hapus episode" aria-label={`Hapus episode ${episode.number} ${animeTitle}`} onClick={() => setConfirm(true)}><Trash2 className="text-destructive" /></Button>
    <AlertDialog open={confirm} onOpenChange={(open) => { if (!busy) setConfirm(open); }}><AlertDialogContent><AlertDialogTitle>Hapus episode?</AlertDialogTitle><AlertDialogDescription>Episode {episode.number} dari “{animeTitle}” akan dihapus. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription><AlertDialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>Batal</Button><Button variant="destructive" disabled={busy} onClick={() => { void remove(); }}>{busy ? "Menghapus…" : "Hapus episode"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}