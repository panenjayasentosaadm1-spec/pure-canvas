import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { AD_SLOTS, saveAdSlot, type AdSlotSetting } from "@/api/ad-slots";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function AdSlotForm({ slot, saved }: { slot: typeof AD_SLOTS[number]; saved: AdSlotSetting }) {
  const [code, setCode] = useState(saved.code);
  const [enabled, setEnabled] = useState(saved.enabled);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const queryClient = useQueryClient();
  const dirty = code !== saved.code || enabled !== saved.enabled;
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setFeedback("");
    try {
      await saveAdSlot(slot.id, { code, enabled });
      setFailed(false); setFeedback("Pengaturan iklan tersimpan."); toast.success(`${slot.name} tersimpan.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "ad-slots"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "ad-slots"] }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan iklan.";
      setFailed(true); setFeedback(message); toast.error(message);
    } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="min-w-0 border-b border-border py-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><h2 className="text-xl font-semibold">{slot.name}</h2><p className="mt-1 text-sm text-muted-foreground">{slot.placement}</p></div>
      <div className="flex items-center gap-3"><Label htmlFor={`${slot.id}-enabled`}>{enabled ? "Aktif" : "Nonaktif"}</Label><Switch id={`${slot.id}-enabled`} checked={enabled} onCheckedChange={setEnabled} disabled={busy} /></div>
    </div>
    <Label htmlFor={`${slot.id}-code`} className="mb-2 mt-5 block">Kode iklan lengkap</Label>
    <Textarea id={`${slot.id}-code`} value={code} onChange={(event) => setCode(event.target.value)} disabled={busy} rows={9} spellCheck={false} autoCapitalize="off" autoCorrect="off" className="max-w-full resize-y font-mono text-sm" />
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={busy}><Save />{busy ? "Menyimpan…" : "Simpan"}</Button>
      {dirty && <span className="text-sm text-muted-foreground">Perubahan belum disimpan</span>}
      {feedback && <p role={failed ? "alert" : "status"} className={failed ? "break-words text-sm text-destructive" : "break-words text-sm text-muted-foreground"}>{feedback}</p>}
    </div>
  </form>;
}