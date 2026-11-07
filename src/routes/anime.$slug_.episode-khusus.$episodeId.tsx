import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { animeDetailQuery, episodesQuery, prefetchSiteChrome, tagsQuery } from "@/api/queries";
import { getSpecialEpisode } from "@/api/episodes";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useEffect, useState, type CSSProperties } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, List, X } from "lucide-react";
import { AnimeInfo } from "@/components/AnimeInfo";
import { EpisodeGrid } from "@/components/EpisodeGrid";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { canonicalHead } from "@/lib/head-meta";
import { Button } from "@/components/ui/button";
import { UniversalPlayer } from "@/components/player/UniversalPlayer";
import { PageSkeleton } from "@/components/PageSkeleton";

export const Route = createFileRoute("/anime/$slug_/episode-khusus/$episodeId")({
  staticData: { sitemap: true },
  loader: async ({ context, params }) => {
    // PostgREST melempar error pada id non-UUID; format salah berarti 404.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.episodeId)) {
      throw notFound();
    }

    const anime = await context.queryClient.fetchQuery(animeDetailQuery(params.slug));
    if (!anime) throw notFound();

    const episode = await getSpecialEpisode(anime.id, params.episodeId);
    if (!episode) throw notFound();

    await Promise.all([
      context.queryClient.fetchQuery(episodesQuery(anime.id)),
      context.queryClient.fetchQuery(tagsQuery),
      prefetchSiteChrome(context.queryClient),
    ]);

    return { anime, episode };
  },
  head: ({ params, loaderData, match }) => {
    const missing = match.status === "notFound";
    const label = loaderData?.episode.specialLabel?.toUpperCase() ?? "Episode khusus";
    const title = loaderData
      ? `${loaderData.anime.title} ${label} Sub Indo — UsagiNime`
      : missing
        ? "Episode tidak ditemukan"
        : "Episode anime";

    const description = loaderData
      ? `Nonton ${loaderData.anime.title} ${label} subtitle Indonesia di UsagiNime. Ikuti kelanjutan cerita, jelajahi daftar episode, dan nikmati anime favoritmu.`
      : missing
        ? "Episode khusus ini tidak tersedia. Kunjungi halaman anime untuk melihat episode lainnya."
        : "Nonton episode khusus anime subtitle Indonesia di UsagiNime.";

    const canonical = loaderData
      ? canonicalHead(`/anime/${params.slug}/episode-khusus/${params.episodeId}`)
      : undefined;

    return {
      meta: [
        { title: `${title} — UsagiNime` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(canonical?.meta ?? []),
      ],
      links: [...(canonical?.links ?? [])],
    };
  },
  pendingComponent: () => <PageSkeleton variant="episode" />,
  errorComponent: ResourceError,
  notFoundComponent: ResourceNotFound,
  component: SpecialEpisodePage,
});

function SpecialEpisodePage() {
  const { anime, episode } = Route.useLoaderData();
  const { data: allEpisodes } = useSuspenseQuery(episodesQuery(anime.id));
  const { data: tags } = useSuspenseQuery(tagsQuery);

  const episodes = allEpisodes
    .filter((item) => item.isPublished)
    .sort((a, b) => {
      if (a.number !== null && b.number !== null) return a.number - b.number;
      if (a.number !== null) return -1;
      if (b.number !== null) return 1;
      return a.publishedAt.localeCompare(b.publishedAt);
    });

  const index = episodes.findIndex((item) => item.id === episode.id);
  const previous = episodes[index - 1];
  const next = episodes[index + 1];

  const label = episode.specialLabel?.toUpperCase() ?? "SPECIAL";
  const title = `${anime.title} - ${label}`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = episodes.filter((item) => {
    const itemLabel = item.specialLabel?.toUpperCase() ?? `EP ${item.number}`;
    const query = search.trim().toLocaleLowerCase("id");

    return (
      !query ||
      itemLabel.toLocaleLowerCase("id").includes(query) ||
      String(item.number ?? "").includes(query) ||
      item.title.toLocaleLowerCase("id").includes(query)
    );
  });

  const goToEpisode = (destination: (typeof episodes)[number]) => {
    if (destination.specialLabel) {
      void navigate({
        to: "/anime/$slug/episode-khusus/$episodeId",
        params: { slug: anime.slug, episodeId: destination.id },
      });
    } else if (destination.number !== null) {
      void navigate({
        to: "/anime/$slug/episode/$number",
        params: { slug: anime.slug, number: String(destination.number) },
      });
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (
        open ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (target instanceof HTMLElement &&
          (target.closest("input, textarea, select, [role='textbox']") ||
            target.isContentEditable))
      ) {
        return;
      }

      const destination =
        event.key === "ArrowLeft"
          ? previous
          : event.key === "ArrowRight"
            ? next
            : undefined;

      if (!destination) return;

      event.preventDefault();
      goToEpisode(destination);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, previous, next, anime.slug, navigate]);

  const closePanel = () => {
    setOpen(false);
    setSearch("");
  };

  const episodeLink = (item: (typeof episodes)[number]) => {
    if (item.specialLabel) {
      return {
        to: "/anime/$slug/episode-khusus/$episodeId" as const,
        params: { slug: anime.slug, episodeId: item.id },
      };
    }

    return {
      to: "/anime/$slug/episode/$number" as const,
      params: { slug: anime.slug, number: String(item.number) },
    };
  };

  return (
    <SiteLayout>
      <div style={playerVars} className="min-w-0">
        <h1
          className="mb-3 truncate text-xl font-bold leading-8 tracking-normal md:text-2xl md:leading-8"
          title={title}
        >
          <Link
            to="/anime/$slug"
            params={{ slug: anime.slug }}
            className="hover:text-primary"
          >
            {anime.title}
          </Link>{" "}
          - {label}
        </h1>

        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) setSearch("");
          }}
        >
          <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-md border border-border bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg outline-none md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[min(640px,calc(100%-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-md md:p-6">
              <DialogTitle className="pr-10 tracking-normal">
                Daftar Episode
              </DialogTitle>
              <DialogDescription className="mt-2 pr-10">
                {anime.title}
              </DialogDescription>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Tutup"
                  title="Tutup"
                  className="absolute right-3 top-3"
                >
                  <X />
                </Button>
              </DialogClose>

              {episodes.length > 24 && (
                <div className="mt-5">
                  <label
                    htmlFor="episode-search"
                    className="mb-2 block text-sm"
                  >
                    Cari nomor, label, atau judul episode
                  </label>
                  <Input
                    id="episode-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nomor, label, atau judul"
                  />
                </div>
              )}

              <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8">
                {filtered.map((item) => {
                  const itemLabel =
                    item.specialLabel?.toUpperCase() ?? `EP ${item.number}`;

                  return (
                    <Button
                      key={item.id}
                      asChild
                      variant={item.id === episode.id ? "default" : "outline"}
                      className="min-w-0 px-0"
                    >
                      <Link
                        {...episodeLink(item)}
                        aria-label={itemLabel}
                        aria-current={item.id === episode.id ? "page" : undefined}
                        title={item.title || itemLabel}
                        onClick={closePanel}
                      >
                        {itemLabel}
                      </Link>
                    </Button>
                  );
                })}
              </div>

              {filtered.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Episode tidak ditemukan.
                </p>
              )}
            </DialogPrimitive.Content>
          </DialogPortal>
        </Dialog>

        <div className="mx-auto w-full md:w-[min(100%,calc((100dvh_-_var(--ep-chrome))*16/9))]">
          <UniversalPlayer embedUrl={episode.embedUrl} title={title} />

          <div
            aria-label="Navigasi episode"
            className="mt-3 grid max-h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
          >
            {previous ? (
              <Button
                variant="outline"
                className="justify-self-start px-3"
                title="Sebelumnya"
                onClick={() => goToEpisode(previous)}
              >
                <ArrowLeft />
                <span className="hidden md:inline">Sebelumnya</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                aria-label="Sebelumnya"
                className="justify-self-start px-3"
                title="Sebelumnya"
              >
                <ArrowLeft />
                <span className="hidden md:inline">Sebelumnya</span>
              </Button>
            )}

            <Button
              variant="secondary"
              className="min-w-0 px-3"
              onClick={() => setOpen(true)}
            >
              <List />
              Daftar Episode
            </Button>

            {next ? (
              <Button
                variant="outline"
                className="justify-self-end px-3"
                title="Berikutnya"
                onClick={() => goToEpisode(next)}
              >
                <span className="hidden md:inline">Berikutnya</span>
                <ArrowRight />
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled
                aria-label="Berikutnya"
                className="justify-self-end px-3"
                title="Berikutnya"
              >
                <span className="hidden md:inline">Berikutnya</span>
                <ArrowRight />
              </Button>
            )}
          </div>

          <EpisodeGrid
            slug={anime.slug}
            episodes={episodes}
            posterUrl={anime.posterUrl}
            animeTitle={anime.title}
            currentEpisodeId={episode.id}
          />
        </div>

        <div className="mt-3.5 border-t border-border/60 pt-3.5 md:mt-5 md:pt-5">
          <AnimeInfo
            key={anime.id}
            anime={anime}
            episodes={episodes}
            tags={tags}
            heading="h2"
            variant="compact"
          />
        </div>
      </div>
    </SiteLayout>
  );
}

const playerVars = {
  "--ep-header": "65px",
  "--ep-main-pad": "2rem",
  "--ep-title": "2rem",
  "--ep-controls": "3rem",
  "--ep-gaps": "2.5rem",
  "--ep-chrome":
    "calc(var(--ep-header) + var(--ep-main-pad) + var(--ep-title) + var(--ep-controls) + var(--ep-gaps))",
} as CSSProperties;
