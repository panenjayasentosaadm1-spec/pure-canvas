import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { animeDetailQuery, episodesQuery, prefetchSiteChrome, tagsQuery } from "@/api/queries";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useEffect, useState, type CSSProperties } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, List, X } from "lucide-react";
import { AnimeInfo } from "@/components/AnimeInfo";
import { EpisodeGrid } from "@/components/EpisodeGrid";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { canonicalHead } from "@/lib/head-meta";
import { Button } from "@/components/ui/button";
import { UniversalPlayer } from "@/components/player/UniversalPlayer";
import { PageSkeleton } from "@/components/PageSkeleton";
import { EpisodeHeader } from "@/components/episode/EpisodeHeader";
import { EpisodeComments } from "@/components/episode/EpisodeComments";

export const Route = createFileRoute("/anime/$slug_/episode/$number")({
  staticData: { sitemap: true },
  loader: async ({ context, params }) => {
    if (!/^\d+$/.test(params.number)) throw notFound();

    const anime = await context.queryClient.fetchQuery(
      animeDetailQuery(params.slug),
    );
    if (!anime) throw notFound();

    const episodes = await context.queryClient.fetchQuery(
      episodesQuery(anime.id),
    );

    const episode = episodes.find(
      (item) =>
        item.number === Number(params.number) &&
        item.specialLabel == null &&
        item.isPublished,
    );

    if (!episode) throw notFound();

    await Promise.all([
      context.queryClient.fetchQuery(tagsQuery),
      prefetchSiteChrome(context.queryClient),
    ]);
    return { anime, episode };
  },
  head: ({ params, loaderData, match }) => {
    const missing = match.status === "notFound";
    const episodeLabel = loaderData ? `Episode ${loaderData.episode.number}` : "Episode";
    const title = loaderData
      ? `${loaderData.anime.title} Episode ${loaderData.episode.number} Sub Indo — UsagiNime`
      : missing
        ? "Episode tidak ditemukan"
        : "Episode anime";

    const description = loaderData
      ? `Nonton ${loaderData.anime.title} ${episodeLabel} subtitle Indonesia di UsagiNime. Ikuti kelanjutan cerita, jelajahi daftar episode, dan nikmati anime favoritmu.`
      : missing
        ? "Episode ini tidak tersedia. Kunjungi halaman anime untuk melihat episode lainnya."
        : "Nonton episode anime subtitle Indonesia dan ikuti kelanjutan cerita di UsagiNime.";

    const canonical = loaderData
      ? canonicalHead(`/anime/${params.slug}/episode/${params.number}`)
      : undefined;

    const imageUrl = loaderData
      ? loaderData.episode.thumbnailUrl || loaderData.anime.posterUrl || ""
      : "";
    const validImage = /^https?:\/\//i.test(imageUrl) ? imageUrl : "";
    const imageMeta = validImage
      ? [
          { property: "og:image", content: validImage },
          { name: "twitter:image", content: validImage },
        ]
      : [];
    const videoLd = loaderData && canonical ? buildVideoObject(loaderData, canonical.links[0]?.href ?? "", validImage) : null;

    return {
      scripts: videoLd ? [{ type: "application/ld+json", children: JSON.stringify(videoLd) }] : [],
      meta: [
        { title: `${title} — UsagiNime` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...imageMeta,
        ...(canonical?.meta ?? []),
      ],
      links: [...(canonical?.links ?? [])],
    };
  },
  pendingComponent: () => <PageSkeleton variant="episode" />,
  errorComponent: ResourceError,
  notFoundComponent: ResourceNotFound,
  component: EpisodePage,
});

function toIsoDate(value: string | undefined): string {
  if (!value) return "";
  const time = Date.parse(value);
  return Number.isNaN(time) ? "" : new Date(time).toISOString();
}

function buildVideoObject(
  data: { anime: { title: string; synopsis: string }; episode: { number: number | null; title: string; publishedAt: string; updatedAt?: string | undefined } },
  url: string,
  thumbnailUrl: string,
): Record<string, unknown> | null {
  const { anime, episode } = data;
  const uploadDate = toIsoDate(episode.publishedAt) || toIsoDate(episode.updatedAt);
  const description = (episode.title || anime.synopsis || "").trim();
  if (!url || !thumbnailUrl || !uploadDate) return null;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${anime.title} Episode ${episode.number}`,
    description: description || `${anime.title} Episode ${episode.number}`,
    thumbnailUrl: [thumbnailUrl],
    uploadDate,
    url,
    publisher: { "@type": "Organization", name: "UsagiNime", url: "https://usaginime.online" },
  };
  return ld;
}

function EpisodePage() {
  const { anime, episode } = Route.useLoaderData();
  const { data: allEpisodes } = useSuspenseQuery(episodesQuery(anime.id));
  const { data: tags } = useSuspenseQuery(tagsQuery);

  const episodes = allEpisodes
    .filter((item) => item.isPublished)
    .sort((a, b) => {
      if (a.number !== null && b.number !== null) {
        return a.number - b.number;
      }
      if (a.number !== null) return -1;
      if (b.number !== null) return 1;
      return a.publishedAt.localeCompare(b.publishedAt);
    });

  const index = episodes.findIndex((item) => item.id === episode.id);
  const previous = episodes[index - 1];
  const next = episodes[index + 1];

  const episodeLabel = episode.specialLabel
    ? episode.specialLabel.toUpperCase()
    : `Episode ${episode.number}`;

  const title = `${anime.title} - ${episodeLabel}`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = episodes.filter((item) => {
    const query = search.trim().toLocaleLowerCase("id");
    if (!query) return true;

    const label = item.specialLabel
      ? item.specialLabel.toUpperCase()
      : `Episode ${item.number}`;

    return (
      String(item.number ?? "").includes(query) ||
      label.toLocaleLowerCase("id").includes(query) ||
      (item.title ?? "").toLocaleLowerCase("id").includes(query)
    );
  });

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
          (target.closest(
            "input, textarea, select, [role='textbox']",
          ) ||
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
      void navigate(episodeLink(destination));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, previous, next, anime.slug, navigate]);

  const closePanel = () => {
    setOpen(false);
    setSearch("");
  };

  return (
    <SiteLayout>
      <div style={playerVars} className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(18rem,3fr)]">
        <main className="min-w-0 lg:col-start-1 lg:row-start-1">
          <EpisodeHeader
            animeSlug={anime.slug}
            animeTitle={anime.title}
            episodeLabel={episodeLabel}
            publishedAt={episode.publishedAt}
          />
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
                    Cari nomor, judul, atau tipe episode
                  </label>
                  <Input
                    id="episode-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Contoh: 2, OVA, atau Final"
                  />
                </div>
              )}

              <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8">
                {filtered.map((item) => {
                  const label = item.specialLabel
                    ? item.specialLabel.toUpperCase()
                    : String(item.number);

                  return (
                    <Button
                      key={item.id}
                      asChild
                      variant={item.id === episode.id ? "default" : "outline"}
                      className="min-w-0 px-0"
                    >
                      <Link
                        {...episodeLink(item)}
                        aria-label={
                          item.specialLabel
                            ? item.specialLabel.toUpperCase()
                            : `Episode ${item.number}`
                        }
                        aria-current={
                          item.id === episode.id ? "page" : undefined
                        }
                        title={item.title ?? label}
                        onClick={closePanel}
                      >
                        {label}
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

        <div className="mx-auto mt-5 w-full md:w-[min(100%,calc((100dvh_-_var(--ep-chrome))*16/9))]">
          <UniversalPlayer embedUrl={episode.embedUrl} title={title} />

          <div
            aria-label="Navigasi episode"
            className="mt-3 grid max-h-none grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 lg:max-h-12"
          >
            {previous ? (
              <Button
                asChild
                variant="outline"
                className="justify-self-start px-3"
                title="Sebelumnya"
              >
                <Link
                  aria-label="Sebelumnya"
                  {...episodeLink(previous)}
                >
                  <ArrowLeft />
                  <span className="hidden md:inline">Sebelumnya</span>
                </Link>
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
                asChild
                variant="outline"
                className="justify-self-end px-3"
                title="Berikutnya"
              >
                <Link aria-label="Berikutnya" {...episodeLink(next)}>
                  <span className="hidden md:inline">Berikutnya</span>
                  <ArrowRight />
                </Link>
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

          <div className="mt-2 min-w-0 border-t border-border/60 pt-4 lg:hidden">
            <AnimeInfo
              key={`${anime.id}-mobile`}
              anime={anime}
              episodes={episodes}
              tags={tags}
              heading="h2"
              variant="compact"
              showTitle={false}
              showSynopsis={false}
            />
          </div>

          <EpisodeGrid
            slug={anime.slug}
            episodes={episodes}
            posterUrl={anime.posterUrl}
            animeTitle={anime.title}
            currentEpisodeId={episode.id}
          />
        </div>
        </main>

        <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:block lg:self-start">
          <AnimeInfo
            key={anime.id}
            anime={anime}
            episodes={episodes}
            tags={tags}
            heading="h2"
            variant="compact"
          />
        </aside>

        <div className="min-w-0 border-t border-border/60 pt-5 lg:col-start-1 lg:row-start-2">
          <EpisodeComments episodeId={episode.id} />
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
