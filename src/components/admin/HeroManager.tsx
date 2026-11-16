import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { HERO_MAX_ITEMS, adminHeroQuery, saveHero, type HeroConfig } from "@/api/hero";
import { animeListQuery } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

/** Admin editor for the homepage hero, stored in site_settings.hero. */
export function HeroManager() {
  const { data: saved } = useQuery(adminHeroQuery);
  const { data: animes } = useQuery(animeListQuery({}));
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<HeroConfig | null>(null);
  const [picker, setPicker] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (saved) setConfig(saved);
  }, [saved]);

  if (!config) {
    return <p className="text-sm text-muted-foreground">Memuat hero…</p>;
  }

  const dirty =
    config.enabled !== saved?.enabled ||
    config.items.length !== saved?.items.length ||
    config.items.some((id, i) => id !== saved?.items[i]);

  function move(index: number, direction: -1 | 1) {
    setConfig((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.items.length) return current;
      const items = [...current.items];
      const moved = items.splice(index, 1)[0] ?? "";
      items.splice(target, 0, moved);
      return { ...current, items };
    });
  }

  function remove(index: number) {
    setConfig((current) => current && { ...current, items: current.items.filter((_, i) => i !== index) });
  }

  function add() {
    if (!picker) return;
    setConfig((current) => {
      if (!current || current.items.includes(picker) || current.items.length >= HERO_MAX_ITEMS) return current;
      return { ...current, items: [...current.items, picker] };
    });
    setPicker("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!config) return;
    setBusy(true);
    try {
      await saveHero(config);
      await queryClient.invalidateQueries({ queryKey: ["hero"] });
      toast.success("Hero beranda tersimpan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan hero.");
    } finally {
      setBusy(false);
    }
  }

  const selectable = (animes ?? []).filter((anime) => !config.items.includes(anime.id));
  const titleById = new Map((animes ?? []).map((anime) => [anime.id, anime.title]));

  return (
    <form onSubmit={submit} className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Hero beranda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kartu unggulan besar di bagian atas beranda, di atas Banner 1.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="hero-enabled">{config.enabled ? "Aktif" : "Nonaktif"}</Label>
          <Switch
            id="hero-enabled"
            checked={config.enabled}
            onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
            disabled={busy}
          />
        </div>
      </div>

      <Label htmlFor="hero-picker" className="mb-2 mt-5 block">
        Tambah anime unggulan (maksimal {HERO_MAX_ITEMS}, hanya yang sudah terbit)
      </Label>
      <div className="flex max-w-md gap-2">
        <Select value={picker} onValueChange={setPicker} disabled={busy}>
          <SelectTrigger id="hero-picker" className="min-w-0 flex-1">
            <SelectValue placeholder="Pilih anime" />
          </SelectTrigger>
          <SelectContent>
            {selectable.map((anime) => (
              <SelectItem key={anime.id} value={anime.id}>{anime.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={add} disabled={busy || !picker || config.items.length >= HERO_MAX_ITEMS}>
          <Plus />Tambah
        </Button>
      </div>

      {config.items.length > 0 ? (
        <ol className="mt-4 max-w-md space-y-2">
          {config.items.map((id, index) => (
            <li key={id} className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{titleById.get(id) ?? id}</span>
              <Button type="button" variant="ghost" size="icon" aria-label="Naikkan" disabled={busy || index === 0} onClick={() => move(index, -1)}>
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Turunkan" disabled={busy || index === config.items.length - 1} onClick={() => move(index, 1)}>
                <ArrowDown />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Hapus" disabled={busy} onClick={() => remove(index)}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Belum ada anime unggulan.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || !dirty}>
          <Save />{busy ? "Menyimpan…" : "Simpan hero"}
        </Button>
        {dirty && <span className="text-sm text-muted-foreground">Perubahan belum disimpan</span>}
      </div>
    </form>
  );
}
