import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAnimeBySlug, listAnime } from "@/api/anime";
import { getAdminCounts } from "@/api/admin";
import { getEpisode, listEpisodesByAnime } from "@/api/episodes";
import { seedAnime, seedEpisodes } from "@/api/mockData";
import type { Anime, Episode } from "@/api/types";
import { playableEmbedUrl } from "@/lib/player";

const { from, storageFrom, fixtureTables } = vi.hoisted(() => ({
  from: vi.fn(),
  storageFrom: vi.fn(),
  fixtureTables: {
    current: null as Record<string, Array<Record<string, unknown>>> | null,
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from, storage: { from: storageFrom } },
}));

type Row = Record<string, unknown>;
type QueryResult = { data: unknown; error: unknown; count?: number };

/** Chaining and result shape the tested API functions use. */
interface QueryChain extends PromiseLike<QueryResult> {
  select: (
    columns?: string,
    options?: { count?: string; head?: boolean },
  ) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  is: (column: string, value: unknown) => QueryChain;
  neq: (column: string, value: unknown) => QueryChain;
  in: (column: string, values: unknown[]) => QueryChain;
  ilike: (column: string, pattern: string) => QueryChain;
  not: (column: string, operator: string, value: unknown) => QueryChain;
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean },
  ) => QueryChain;
  limit: (max: number) => QueryChain;
  maybeSingle: () => QueryChain;
  single: () => QueryChain;
}

/** Database-shaped fixture row for one seeded anime. */
function toAnimeRow(anime: Anime): Row {
  return {
    id: anime.id,
    title: anime.title,
    slug: anime.slug,
    synopsis: anime.synopsis,
    poster_path: anime.posterUrl,
    alt_title: anime.altTitle ?? null,
    studio: anime.studio ?? null,
    rating: anime.rating ?? null,
    duration_minutes: anime.durationMinutes ?? null,
    total_episodes: anime.totalEpisodes ?? null,
    type: anime.type,
    status: anime.status,
    season: anime.season || null,
    year: anime.year,
    is_published: anime.isPublished,
    created_at: anime.createdAt,
    updated_at: anime.updatedAt,
  };
}

/** Database-shaped fixture row for one seeded episode. */
function toEpisodeRow(episode: Episode): Row {
  return {
    id: episode.id,
    anime_id: episode.animeId,
    number: episode.number,
    special_label: null,
    title: episode.title || null,
    embed_url: episode.embedUrl || null,
    thumbnail_path: episode.thumbnailUrl ?? null,
    is_published: episode.isPublished,
    published_at: episode.publishedAt || null,
    created_at: episode.publishedAt,
    updated_at: episode.updatedAt ?? episode.publishedAt,
  };
}

/** Fresh fixtures per test, derived from the seed data; anime_tags stays empty. */
function buildFixtures(): Record<string, Row[]> {
  return {
    anime: seedAnime.map(toAnimeRow),
    episodes: seedEpisodes.map(toEpisodeRow),
    anime_tags: [],
  };
}

/**
 * Minimal filter-aware Supabase query builder over fixture rows: select (with
 * head-count options), eq, neq, in, ilike, not, order, limit, maybeSingle.
 */
function createQueryMock(rows: Row[]): QueryChain {
  let filtered = [...rows];
  let countOptions: { count?: string; head?: boolean } | undefined;
  let single = false;

  const filter = (predicate: (row: Row) => boolean) => {
    filtered = filtered.filter(predicate);
    return chain;
  };

  const chain: QueryChain = {
    select(_columns, options) {
      countOptions = options;
      return chain;
    },
    eq(column, value) {
      return filter((row) => row[column] === value);
    },
    neq(column, value) {
      return filter((row) => row[column] !== value);
    },
    is(column, value) {
      return value === null
        ? filter((row) => row[column] == null)
        : filter((row) => row[column] === value);
    },
    in(column, values) {
      return filter((row) => values.includes(row[column]));
    },
    ilike(column, pattern) {
      const needle = String(pattern).replace(/%/g, "").toLowerCase();
      return filter((row) =>
        String(row[column] ?? "").toLowerCase().includes(needle),
      );
    },
    not(column, operator, value) {
      if (operator === "is" && value === null) {
        return filter((row) => row[column] != null);
      }
      return chain;
    },
    order(column, options) {
      const ascending = options?.ascending !== false;
      filtered.sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        const compare =
          av == null && bv == null
            ? 0
            : av == null
              ? 1
              : bv == null
                ? -1
                : av === bv
                  ? 0
                  : av > bv
                    ? 1
                    : -1;
        return ascending ? compare : -compare;
      });
      return chain;
    },
    limit(max) {
      filtered = filtered.slice(0, Math.max(0, max));
      return chain;
    },
    maybeSingle() {
      single = true;
      return chain;
    },
    single() {
      single = true;
      return chain;
    },
    then(resolve, reject) {
      let result: QueryResult;
      if (countOptions?.count) {
        result = {
          data: countOptions.head ? null : filtered,
          error: null,
          count: filtered.length,
        };
      } else if (single) {
        result = { data: filtered[0] ?? null, error: null };
      } else {
        result = { data: filtered, error: null };
      }
      return Promise.resolve(result).then(resolve, reject);
    },
  };

  return chain;
}

describe("Published mock resources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixtureTables.current = buildFixtures();
    from.mockImplementation((table: string) => {
      const tables = fixtureTables.current;
      if (!tables || !(table in tables)) {
        throw new Error(`Unexpected query on table: ${table}`);
      }
      return createQueryMock(tables[table] ?? []);
    });
    storageFrom.mockImplementation((bucket: string) => ({
      getPublicUrl: (path: string) => ({
        data: {
          publicUrl: `https://storage.test/storage/v1/object/public/${bucket}/${path}`,
        },
      }),
    }));
  });

  it("does not expose missing or unpublished anime", async () => {
    expect(await getAnimeBySlug("missing")).toBeNull();
    expect(await getAnimeBySlug("negeri-di-balik-cermin")).toBeNull();
    expect((await listAnime()).some((item) => !item.isPublished)).toBe(false);
  });

  it("maps available anime detail metadata from the database row", async () => {
    const row = fixtureTables.current?.["anime"]?.find(
      (item) => item["slug"] === "langit-di-atas-negeri-awan",
    );
    if (!row) throw new Error("Missing anime detail fixture");
    row["alt_title"] = "Cloud Sky Chronicle";
    row["studio"] = "Studio Example";
    row["duration_minutes"] = 24;
    row["total_episodes"] = 12;

    const anime = await getAnimeBySlug("langit-di-atas-negeri-awan");

    expect(anime).toMatchObject({
      altTitle: "Cloud Sky Chronicle",
      studio: "Studio Example",
      durationMinutes: 24,
      totalEpisodes: 12,
    });
  });

  it("does not fabricate unavailable anime detail metadata", async () => {
    const anime = await getAnimeBySlug("langit-di-atas-negeri-awan");

    expect(anime).toMatchObject({
      altTitle: "",
      studio: "",
      durationMinutes: null,
      totalEpisodes: null,
    });
  });

  it("omits unpublished episodes from reads and ordered navigation", async () => {
    const episodes = fixtureTables.current?.["episodes"] ?? [];
    const episode = episodes.find(
      (row) => row["id"] === "anime-langit-awan-ep-2",
    );
    if (!episode) throw new Error("Missing episode fixture");
    episode["is_published"] = false;

    expect(await getEpisode("anime-langit-awan", 2)).toBeNull();
    expect(
      (await listEpisodesByAnime("anime-langit-awan")).map(
        (item) => item.number,
      ),
    ).toEqual([1, 3, 4, 5, 6]);
  });

  it("counts all anime, episodes and unpublished drafts", async () => {
    expect(await getAdminCounts()).toEqual({
      anime: 12,
      episodes: 32,
      drafts: 3,
    });
  });
});

describe("Episode embeds", () => {
  it("rejects placeholder embeds", () => {
    expect(playableEmbedUrl("https://example.com/embed/belum-tersedia")).toBeNull();
    expect(playableEmbedUrl("")).toBeNull();
    expect(playableEmbedUrl("javascript:alert(1)")).toBeNull();
  });
  it("accepts a real HTTPS embed", () => {
    expect(playableEmbedUrl("https://www.youtube-nocookie.com/embed/abc")).toBe("https://www.youtube-nocookie.com/embed/abc");
  });
});
