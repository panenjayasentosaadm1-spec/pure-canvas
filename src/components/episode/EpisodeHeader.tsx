import { Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";
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

  const currentUrl = typeof window === "undefined" ? "" : window.location.href;
  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(shareTitle);
  const shareLinks = [
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, color: "bg-blue-600 hover:bg-blue-700", icon: <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.5 1.6-1.5h1.7V3.1c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.7-4.5 4.7v2H6.8v3.2h2.8V21h3.9Z" /> },
    { name: "WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, color: "bg-green-600 hover:bg-green-700", icon: <path d="M12.04 2a9.9 9.9 0 0 0-8.52 14.95L2 22l5.2-1.36A9.94 9.94 0 1 0 12.04 2Zm0 18.1a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.08.8.82-3-.2-.31a8.13 8.13 0 1 1 6.9 3.82Zm4.46-6.08c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.34-1.68-.14-.24-.02-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.15 1.52.09.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" /> },
    { name: "X", href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, color: "bg-neutral-900 hover:bg-neutral-800", icon: <path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.43L5.55 22H2.42l7.25-8.29L1.8 2h6.4l4.43 6.77L18.9 2Zm-1.1 18h1.73L7.27 3.9H5.42L17.8 20Z" /> },
    { name: "Telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`, color: "bg-sky-500 hover:bg-sky-600", icon: <path d="m21.8 4.2-3.3 15.55c-.25 1.1-.9 1.37-1.83.85l-5.06-3.73-2.44 2.35c-.27.27-.5.5-1.02.5l.37-5.15 9.38-8.48c.4-.36-.09-.56-.62-.2L5.7 13.1.7 11.54c-1.08-.34-1.1-1.08.23-1.6L20.5 2.4c.9-.33 1.7.22 1.3 1.8Z" /> },
  ];

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
      <div className="mt-3 flex w-full min-w-0 flex-nowrap gap-1">
        {shareLinks.map(({ name, href, color, icon }) => (
          <Button key={name} asChild variant="ghost" className={`h-8 min-w-0 flex-1 basis-0 gap-0.5 whitespace-nowrap px-0.5 text-[8px] text-white min-[320px]:text-[9px] sm:text-xs ${color}`}>
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Bagikan melalui ${name}`} className="min-w-0 flex-nowrap justify-center gap-0.5">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3 shrink-0 fill-current">{icon}</svg>
              <span className="shrink-0 whitespace-nowrap">{name}</span>
            </a>
          </Button>
        ))}
        <Button variant="outline" className="h-8 min-w-0 flex-1 basis-0 gap-0.5 whitespace-nowrap px-0.5 text-[8px] min-[320px]:text-[9px] sm:text-xs" onClick={() => void copy()}>
          <Copy aria-hidden="true" className="size-3 shrink-0" />
          <span className="shrink-0 whitespace-nowrap">Copy Link</span>
        </Button>
      </div>
    </header>
  );
}
