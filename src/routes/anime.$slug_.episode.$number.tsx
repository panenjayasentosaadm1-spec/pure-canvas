import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { animeDetailQuery, episodesQuery, tagsQuery } from "@/api/queries";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { useEffect, useState, type CSSProperties } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, List, X } from "lucide-react";
import { AnimeInfo } from "@/components/AnimeInfo";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResourceError, ResourceNotFound } from "@/components/ResourceState";
import { Button } from "@/components/ui/button";
import { UniversalPlayer } from "@/components/player/UniversalPlayer";
import { PageSkeleton } from "@/components/PageSkeleton";

export const Route = createFileRoute("/anime/$slug_/episode/$number")({
  ssr: false,
  loader: async ({ context, params }) => {
    if (!/^[1-9]\d*$/.test(params.number)) throw notFound();
    const anime = await context.queryClient.fetchQuery(animeDetailQuery(params.slug));
    if (!anime) throw notFound();
    const episodes = await context.queryClient.fetchQuery(episodesQuery(anime.id));
    const episode = episodes.find((item) => item.number === Number(params.number));
    if (!episode) throw notFound();
    await context.queryClient.fetchQuery(tagsQuery);
    return { anime, episode };
  },
  head: ({ loaderData, match }) => {
    const missing = match.status === "notFound";
    const title = loaderData ? `${loaderData.anime.title} Episode ${loaderData.episode.number}` : missing ? "Episode tidak ditemukan" : "Episode anime";
    const description = loaderData?.episode.title ?? (missing ? "Episode ini tidak ada atau belum diterbitkan." : "Tonton episode anime di UsagiNime.");
    return { meta: [{ title: `${title} — UsagiNime` }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
  },
  pendingComponent: () => <PageSkeleton variant="episode" />,
  errorComponent: ResourceError,
  notFoundComponent: ResourceNotFound,
  component: EpisodePage,
});

function EpisodePage() {
  const { anime, episode } = Route.useLoaderData();
  const { data: allEpisodes } = useSuspenseQuery(episodesQuery(anime.id));
  const { data: tags } = useSuspenseQuery(tagsQuery);
  const episodes = allEpisodes.filter((item) => item.isPublished).sort((a, b) => a.number - b.number);
  const index = episodes.findIndex((item) => item.id === episode.id);
  const previous = episodes[index - 1];
  const next = episodes[index + 1];
  const embed = playableEmbedUrl(episode.embedUrl);
  const title = `${anime.title} - Episode ${episode.number}`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const filtered = episodes.filter((item) => !search.trim() || String(item.number).includes(search.trim()) || item.title.toLocaleLowerCase("id").includes(search.trim().toLocaleLowerCase("id")));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || (target instanceof HTMLElement && (target.closest("input, textarea, select, [role='textbox']") || target.isContentEditable))) return;
      const destination = event.key === "ArrowLeft" ? previous : event.key === "ArrowRight" ? next : undefined;
      if (!destination) return;
      event.preventDefault();
      void navigate({ to: "/anime/$slug/episode/$number", params: { slug: anime.slug, number: String(destination.number) } });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, previous, next, anime.slug, navigate]);

  const closePanel = () => { setOpen(false); setSearch(""); };
  return <SiteLayout><div style={playerVars} className="min-w-0">
    <h1 className="mb-3 truncate text-xl font-bold leading-8 tracking-normal md:text-2xl md:leading-8" title={title}><Link to="/anime/$slug" params={{ slug: anime.slug }} className="hover:text-primary">{anime.title}</Link> - Episode {episode.number}</h1>
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setSearch(""); }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-md border border-border bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg outline-none md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[min(640px,calc(100%-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-md md:p-6">
          <DialogTitle className="pr-10 tracking-normal">Daftar Episode</DialogTitle>
          <DialogDescription className="mt-2 pr-10">{anime.title}</DialogDescription>
          <DialogClose asChild><Button variant="ghost" size="icon" aria-label="Tutup" title="Tutup" className="absolute right-3 top-3"><X /></Button></DialogClose>
          {episodes.length > 24 && <div className="mt-5"><label htmlFor="episode-search" className="mb-2 block text-sm">Cari nomor atau judul episode</label><Input id="episode-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nomor atau judul episode" /></div>}
          <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8">
            {filtered.map((item) => <Button key={item.id} asChild variant={item.id === episode.id ? "default" : "outline"} className="min-w-0 px-0"><Link to="/anime/$slug/episode/$number" params={{ slug: anime.slug, number: String(item.number) }} aria-label={`Episode ${item.number}`} aria-current={item.id === episode.id ? "page" : undefined} title={item.title} onClick={closePanel}>{item.number}</Link></Button>)}
          </div>
          {filtered.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Episode tidak ditemukan.</p>}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
    <div className="mx-auto w-full md:w-[min(100%,calc((100dvh_-_var(--ep-chrome))*16/9))]">
      <UniversalPlayer embedUrl={episode.embedUrl} title={title} />
      <div aria-label="Navigasi episode" className="mt-3 grid max-h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        {previous ? <Button asChild variant="outline" className="justify-self-start px-3" title="Sebelumnya"><Link aria-label="Sebelumnya" to="/anime/$slug/episode/$number" params={{ slug: anime.slug, number: String(previous.number) }}><ArrowLeft /><span className="hidden md:inline">Sebelumnya</span></Link></Button> : <Button variant="outline" disabled aria-label="Sebelumnya" className="justify-self-start px-3" title="Sebelumnya"><ArrowLeft /><span className="hidden md:inline">Sebelumnya</span></Button>}
        <Button variant="secondary" className="min-w-0 px-3" onClick={() => setOpen(true)}><List />Daftar Episode</Button>
        {next ? <Button asChild variant="outline" className="justify-self-end px-3" title="Berikutnya"><Link aria-label="Berikutnya" to="/anime/$slug/episode/$number" params={{ slug: anime.slug, number: String(next.number) }}><span className="hidden md:inline">Berikutnya</span><ArrowRight /></Link></Button> : <Button variant="outline" disabled aria-label="Berikutnya" className="justify-self-end px-3" title="Berikutnya"><span className="hidden md:inline">Berikutnya</span><ArrowRight /></Button>}
      </div>
    </div>
    <div className="mt-3.5 border-t border-border/60 pt-3.5 md:mt-5 md:pt-5"><AnimeInfo key={anime.id} anime={anime} episodes={episodes} tags={tags} heading="h2" /></div>
  </div></SiteLayout>;
}

/** Vertical space used around the player on desktop; adjust here if the header or controls change. */
const playerVars = {
  "--ep-header": "65px",
  "--ep-main-pad": "2rem",
  "--ep-title": "2rem",
  "--ep-controls": "3rem",
  "--ep-gaps": "2.5rem",
  "--ep-chrome": "calc(var(--ep-header) + var(--ep-main-pad) + var(--ep-title) + var(--ep-controls) + var(--ep-gaps))",
} as CSSProperties;
