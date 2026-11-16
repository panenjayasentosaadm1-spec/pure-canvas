import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/db-types";
import { listAnimeShared } from "./anime";
import type { Anime } from "./types";

export const HERO_MAX_ITEMS = 6;

/** Stored in the existing site_settings singleton (docs/hero-setup.sql). */
export interface HeroConfig {
  enabled: boolean;
  /** Anime ids in display order. */
  items: string[];
}

export const DEFAULT_HERO: HeroConfig = { enabled: false, items: [] };

/** Tolerant reader: broken or legacy values must never break the homepage. */
export function parseHero(value: unknown): HeroConfig {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawItems = Array.isArray(source["items"]) ? source["items"] : [];
  const items: string[] = [];
  for (const entry of rawItems) {
    if (typeof entry !== "string") continue;
    const id = entry.trim();
    if (!id || items.includes(id) || items.length >= HERO_MAX_ITEMS) continue;
    items.push(id);
  }
  return { enabled: source["enabled"] === true, items };
}

export function serializeHero(config: HeroConfig): { enabled: boolean; items: string[] } {
  const items: string[] = [];
  for (const id of config.items) {
    const trimmed = id.trim();
    if (!trimmed || items.includes(trimmed) || items.length >= HERO_MAX_ITEMS) continue;
    items.push(trimmed);
  }
  return { enabled: !!config.enabled, items };
}

/** The hero migration is optional; before docs/hero-setup.sql runs the column simply does not exist. */
export function isMissingHeroColumn(message: string): boolean {
  return /PGRST204/i.test(message) || /could not find the .?hero.? column/i.test(message);
}

export async function getHero(): Promise<HeroConfig> {
  // The hero column is optional (docs/hero-setup.sql). Selecting the whole row
  // means a database without the column cannot fail the homepage: the missing
  // key simply parses to the default, disabled configuration.
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) {
    throw new Error(`Gagal memuat hero: ${error.message}`);
  }
  return parseHero((data as unknown as Record<string, unknown> | null)?.["hero"]);
}

export async function saveHero(config: HeroConfig): Promise<void> {
  // The hero column only exists after docs/hero-setup.sql runs; cast the
  // payload so TypeScript allows writing the optional column.
  const payload = {
    hero: serializeHero(config),
    updated_at: new Date().toISOString(),
  } as unknown as Database["public"]["Tables"]["site_settings"]["Update"];
  const { data, error } = await supabase
    .from("site_settings")
    .update(payload)
    .eq("id", 1)
    .select("id")
    .maybeSingle();
  if (error) {
    if (isMissingHeroColumn(error.message)) {
      throw new Error("Kolom hero belum tersedia di database. Jalankan SQL pada docs/hero-setup.sql terlebih dahulu.");
    }
    throw new Error(`Gagal menyimpan hero: ${error.message}`);
  }
  if (!data) {
    throw new Error("Pengaturan situs tidak ditemukan atau Anda tidak memiliki akses admin.");
  }
}

export interface HeroContent {
  enabled: boolean;
  /** Resolved published anime in configured order; drafts and deleted ids are skipped. */
  animes: Anime[];
}

export async function getHeroContent(): Promise<HeroContent> {
  const [hero, published] = await Promise.all([getHero(), listAnimeShared()]);
  const byId = new Map(published.map((anime) => [anime.id, anime]));
  return {
    enabled: hero.enabled,
    animes: hero.items.map((id) => byId.get(id)).filter((anime): anime is Anime => !!anime),
  };
}

export const publicHeroQuery = queryOptions({
  queryKey: ["hero", "public"],
  queryFn: getHeroContent,
  staleTime: 5 * 60_000,
  retry: false,
});

export const adminHeroQuery = queryOptions({
  queryKey: ["hero", "admin"],
  queryFn: getHero,
});
