import { Link } from "@tanstack/react-router";
import type { EpisodeCardData } from "@/api/queries";
import { PosterCard } from "@/components/PosterCard";
import { SafeImage } from "@/components/SafeImage";
import { statusLabel, typeLabel } from "@/lib/format";

function getEpisodeLabel(item: EpisodeCardData): string {
  if (item.specialLabel) {
    return item.specialLabel.toUpperCase();
  }

  return `EP ${item.number}`;
}

/** Episode card: episode thumbnail (poster fallback), episode badge, opens the correct episode page. */
export function EpisodeCard({
  item,
  loading = "lazy",
  variant = "default",
}: {
  item: EpisodeCardData;
  loading?: "lazy" | "eager";
  variant?: "default" | "latest";
}) {
  const label = getEpisodeLabel(item);
  const isSpecial = Boolean(item.specialLabel);
  const card = variant === "latest"
    ? <LatestEpisodeVisual item={item} label={label} loading={loading} />
    : (
      <PosterCard
        title={item.anime.title}
        imageAlt={`${item.anime.title} - ${label}`}
        loading={loading}
        posterUrl={item.imageUrl}
        meta={`${typeLabel[item.anime.type]} • ${statusLabel[item.anime.status]}`}
        badge={label}
      />
    );

  if (isSpecial) {
    return (
      <Link
        to="/anime/$slug/episode-khusus/$episodeId"
        params={{
          slug: item.anime.slug,
          episodeId: item.id,
        }}
        aria-label={`${item.anime.title} - ${label}`}
      >
        {card}
      </Link>
    );
  }

  if (item.number === null) {
    return null;
  }

  return (
    <Link
      to="/anime/$slug/episode/$number"
      params={{
        slug: item.anime.slug,
        number: String(item.number),
      }}
      aria-label={`${item.anime.title} - Episode ${item.number}`}
    >
      {card}
    </Link>
  );
}

function formatReleaseTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Jadwal belum tersedia";

  const formatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(date);

  return `${formatted} WIB`;
}

function LatestEpisodeVisual({
  item,
  label,
  loading,
}: {
  item: EpisodeCardData;
  label: string;
  loading: "lazy" | "eager";
}) {
  const status = item.anime.status === "completed"
    ? "Tamat"
    : item.anime.status === "ongoing"
      ? "Ongoing"
      : statusLabel[item.anime.status];

  return (
    <div className="group min-w-0">
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-border bg-card transition-all group-hover:-translate-y-1 group-hover:shadow-glow">
        <SafeImage
          src={item.imageUrl}
          alt={`${item.anime.title} - ${label}`}
          loading={loading}
          className="h-full w-full object-cover object-center transition-transform group-hover:scale-[1.02]"
        />
        <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-[10px] font-bold uppercase leading-none text-primary-foreground sm:text-xs">
          {label}
        </span>
        <span className={`absolute bottom-0 right-0 rounded-tl-lg rounded-br-lg px-2.5 py-1 text-[10px] font-bold leading-none text-primary-foreground sm:text-xs ${item.anime.status === "ongoing" ? "bg-primary" : "bg-secondary text-secondary-foreground"}`}>
          {status}
        </span>
      </div>
      <div className="min-w-0 px-0.5 pt-2">
        <h3 className="line-clamp-2 break-words text-xs font-semibold leading-snug text-foreground sm:text-sm">
          {item.anime.title}
        </h3>
        <p className="mt-1 truncate text-[10px] text-muted-foreground sm:text-xs">
          {formatReleaseTime(item.publishedAt)}
        </p>
      </div>
    </div>
  );
}
