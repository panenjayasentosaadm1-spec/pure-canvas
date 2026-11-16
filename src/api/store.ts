// In-memory mock store, seeded from mockData.ts and persisted to localStorage.
// Everything is wrapped in try/catch and the app works when storage is empty or
// unavailable (SSR, private mode). To swap in a real backend later, only the
// implementations inside src/api/ need to change.

import { seedAnime, seedEpisodes, seedSettings, seedTags, seedAllowedEmbedDomains } from "./mockData";
import type { Anime, Episode, SiteSettings, Tag } from "./types";

const STORAGE_KEY = "usaginime:mockdb:v1";

export interface MockDb {
  allowedEmbedDomains: string[];
  anime: Anime[];
  episodes: Episode[];
  tags: Tag[];
  settings: SiteSettings;
}

function seedDb(): MockDb {
  return {
    allowedEmbedDomains: [...seedAllowedEmbedDomains],
    anime: structuredClone(seedAnime),
    episodes: structuredClone(seedEpisodes),
    tags: structuredClone(seedTags),
    settings: { ...seedSettings },
  };
}

function hasStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function loadDb(): MockDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb;
      if (parsed && Array.isArray(parsed.anime) && Array.isArray(parsed.episodes)) {
        parsed.allowedEmbedDomains ??= [...seedAllowedEmbedDomains];
        parsed.anime = parsed.anime.map(item => ({ ...seedAnime.find(seed => seed.id === item.id), ...item }));
        return parsed;
      }
    }
  } catch {
    // Storage unavailable or corrupted — fall through to a fresh seed.
  }
  // Only reached when storage is empty or invalid: write the seed once.
  const db = seedDb();
  persistDb(db);
  return db;
}

function persistDb(db: MockDb): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }
  } catch {
    // Ignore write failures (quota, private mode) — the in-memory copy still works.
  }
}

let db: MockDb | null = null;

export function getDb(): MockDb {
  // Without browser storage (server render) hand out a throwaway seed copy and never cache it,
  // so it can't leak into later reads. Public pages load store data client-only.
  if (!hasStorage()) return seedDb();
  if (!db) db = loadDb();
  return db;
}

export function saveDb(): void {
  if (db) persistDb(db);
}

/** Tiny artificial delay (30 ms, max 50 ms) so the UI still behaves asynchronously. */
export function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 30));
}

/** Persist a candidate before replacing live state, so quota failures never partially save. */
export function updateDb(change: (candidate: MockDb) => void): void {
  // Re-read storage first so a stale in-memory copy (e.g. another tab) never overwrites newer saved images.
  db = null;
  const candidate = structuredClone(getDb());
  change(candidate);
  const serialized = JSON.stringify(candidate);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, serialized);
      if (localStorage.getItem(STORAGE_KEY) !== serialized) throw new Error("verify");
    }
  } catch {
    throw new Error("Penyimpanan penuh atau tidak tersedia. Gambar tidak tersimpan. Hapus gambar atau data yang tidak diperlukan lalu coba lagi.");
  }
  db = candidate;
}

/** Restore the original seed data. */
export function resetDb(): void {
  const fresh = seedDb();
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    throw new Error("Penyimpanan tidak tersedia. Data contoh gagal dipulihkan.");
  }
  db = fresh;
}
