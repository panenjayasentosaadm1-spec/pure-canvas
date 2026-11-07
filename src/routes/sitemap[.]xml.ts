import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import {
  isSitemapRouteIncluded,
  sitemapPathForLocation,
  sitemapStaticPaths,
  sitemapXML,
  type SitemapEntry,
} from "@/lib/sitemap";

// Domain produksi situs (dipakai juga oleh canonical di src/lib/head-meta.ts).
const BASE_URL = "https://usaginime.online";

const PAGE_SIZE = 1000;
const EPISODE_CHUNK = 100;

type SitemapSupabase = Awaited<ReturnType<typeof createPublicSupabaseClient>>;

/**
 * Klien Supabase publik (kunci publishable, tanpa sesi): kebijakan SELECT
 * publik/RLS tetap berlaku, sitemap tidak pernah memakai kunci service role.
 */
async function createPublicSupabaseClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const key =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];

  if (!url || !key) {
    throw new Error("Kredensial Supabase publik tidak tersedia untuk sitemap.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        // Kunci sb_publishable_ bukan JWT; kirim sebagai apikey, bukan bearer.
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Semua anime yang dipublikasikan, dibaca bertahap sampai habis. */
async function listPublishedAnime(supabase: SitemapSupabase) {
  const rows: { id: string; slug: string }[] = [];

  for (let offset = 0; ; ) {
    const { data, error } = await supabase
      .from("anime")
      .select("id, slug")
      .eq("is_published", true)
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Sitemap gagal membaca anime: ${error.message}`);
    }
    if (data.length === 0) break;

    rows.push(...data);
    offset += data.length;
  }

  return rows;
}

/**
 * Semua episode yang dipublikasikan (biasa maupun khusus) milik anime
 * yang dipublikasikan, dibaca per-chunk anime dan bertahap sampai habis.
 */
async function listPublishedEpisodes(
  supabase: SitemapSupabase,
  animeIds: string[],
) {
  const rows: {
    id: string;
    anime_id: string;
    number: number | null;
    special_label: string | null;
  }[] = [];

  for (let start = 0; start < animeIds.length; start += EPISODE_CHUNK) {
    const chunk = animeIds.slice(start, start + EPISODE_CHUNK);

    for (let offset = 0; ; ) {
      const { data, error } = await supabase
        .from("episodes")
        .select("id, anime_id, number, special_label")
        .eq("is_published", true)
        .in("anime_id", chunk)
        .order("id")
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Sitemap gagal membaca episode: ${error.message}`);
      }
      if (data.length === 0) break;

      rows.push(...data);
      offset += data.length;
    }
  }

  return rows;
}

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));

        const animeRoute = router.routesById["/anime/$slug"];
        const episodeRoute = router.routesById["/anime/$slug_/episode/$number"];
        const specialRoute = router.routesById["/anime/$slug_/episode-khusus/$episodeId"];

        const includeAnime = isSitemapRouteIncluded(animeRoute);
        const includeEpisode = isSitemapRouteIncluded(episodeRoute);
        const includeSpecial = isSitemapRouteIncluded(specialRoute);

        if (includeAnime || includeEpisode || includeSpecial) {
          const supabase = await createPublicSupabaseClient();
          const anime = await listPublishedAnime(supabase);

          if (includeAnime) {
            for (const row of anime) {
              const location = router.buildLocation({
                to: "/anime/$slug",
                params: { slug: row.slug },
                search: () => ({}),
                hash: "",
              });
              const path = sitemapPathForLocation(router, location, animeRoute.id);
              if (path) entries.push({ path });
            }
          }

          if (includeEpisode || includeSpecial) {
            const episodes = await listPublishedEpisodes(
              supabase,
              anime.map((row) => row.id),
            );
            const slugByAnimeId = new Map(anime.map((row) => [row.id, row.slug]));

            for (const row of episodes) {
              const slug = slugByAnimeId.get(row.anime_id);
              if (!slug) continue;

              if (row.special_label !== null && includeSpecial) {
                // Episode khusus diakses publik lewat ID-nya sendiri.
                const location = router.buildLocation({
                  // Path URL tanpa underscore ( "_" hanya bagian ID rute).
                  to: "/anime/$slug/episode-khusus/$episodeId",
                  params: { slug, episodeId: row.id },
                  search: () => ({}),
                  hash: "",
                });
                const path = sitemapPathForLocation(router, location, specialRoute.id);
                if (path) entries.push({ path });
              } else if (row.special_label === null && row.number !== null && includeEpisode) {
                const location = router.buildLocation({
                  to: "/anime/$slug/episode/$number",
                  params: { slug, number: String(row.number) },
                  search: () => ({}),
                  hash: "",
                });
                const path = sitemapPathForLocation(router, location, episodeRoute.id);
                if (path) entries.push({ path });
              }
            }
          }
        }

        if (entries.length === 0) {
          return new Response(
            'No pages are included in this sitemap. Check route decisions and ancestor exclusions. Setting "exclude-subtree" on the root excludes the entire site.',
            { status: 404, headers: { "Cache-Control": "no-store" } },
          );
        }

        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
