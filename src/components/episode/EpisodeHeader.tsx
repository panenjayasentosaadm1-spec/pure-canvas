import { Link } from "@tanstack/react-router";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Breadcrumb, titles, release date and share/copy actions shared by both episode routes. */
export function EpisodeHeader({ animeSlug, animeTitle, episodeLabel, publishedAt }: {
  animeSlug: string; animeTitle: string; episodeLabel: string; publishedAt: string;
}) {
  const date = publishedAt ? new Date(publishedAt) : null;
  const shareTitle = `${animeTitle} - ${episodeLabel}`;

  async function copy() {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Tautan disalin."); }
    catch { toast.error("Gagal menyalin tautan."); }
  }
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: shareTitle, url: window.location.href }); } catch { /* dibatalkan */ }
    } else await copy();
  }

  return (
    <header className="min-w-0">
      <nav aria-label="Breadcrumb" className="mb-2 text-xs text-muted-foreground">
        <ol className="flex min-w-0 flex-wrap items-center gap-1">
          <li><Link to="/" className="hover:text-primary">Beranda</Link></li><li aria-hidden>/</li>
          <li><Link to="/anime" className="hover:text-primary">Anime</Link></li><li aria-hidden>/</li>
          <li className="min-w-0 truncate"><Link to="/anime/$slug" params={{ slug: animeSlug }} className="hover:text-primary">{animeTitle}</Link></li><li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">{episodeLabel}</li>
        </ol>
      </nav>
      <h1 className="text-xl font-bold leading-7 tracking-normal md:text-2xl md:leading-8" title={shareTitle}>
        <Link to="/anime/$slug" params={{ slug: animeSlug }} className="hover:text-primary">{animeTitle}</Link>
        <span className="block text-base font-semibold text-muted-foreground md:text-lg">{episodeLabel}</span>
      </h1>
      {date && !Number.isNaN(date.getTime()) && (
        <p className="mt-1 text-xs text-muted-foreground">Rilis <time dateTime={publishedAt}>{date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</time></p>
      )}
      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => void share()}><Share2 /> Bagikan</Button>
        <Button variant="outline" size="sm" onClick={() => void copy()}><Copy /> Salin Tautan</Button>
      </div>
    </header>
  );
}
