import type { ReactNode } from "react";
import { SafeImage } from "@/components/SafeImage";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  posterUrl?: string | null | undefined;
  meta?: string;
  badge?: string;
  className?: string;
  imageAlt?: string;
  loading?: "lazy" | "eager";
  /** Image aspect ratio; defaults to the shared list ratio, poster cards pass POSTER_CARD_ASPECT. */
  aspect?: string;
};

/** Aspect ratio of every list card image (3:2 landscape). Single source of truth. */
export const LIST_CARD_ASPECT = "aspect-[3/2]";

/** Aspect ratio of anime poster cards (2:3 portrait). Single source of truth. */
export const POSTER_CARD_ASPECT = "aspect-[2/3]";

/** Reusable list card (3:2 landscape by default, 2:3 portrait for poster cards). */
export function PosterCard({ title, posterUrl, meta, badge, className, imageAlt = title, loading = "lazy", aspect = LIST_CARD_ASPECT }: Props) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-glow",
        aspect,
        className,
      )}
    >
      {badge && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-primary px-1.5 py-1 text-xs font-bold uppercase leading-none text-primary-foreground">
          {badge}
        </span>
      )}
      <SafeImage src={posterUrl} alt={imageAlt} loading={loading} className="h-full w-full object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-poster" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold">{title}</h3>
        {meta && <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>}
      </div>
    </div>
  );
}

export function PosterGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4", className)}>{children}</div>;
}

export function PosterSkeleton() {
  return <div className={cn(LIST_CARD_ASPECT, "animate-pulse rounded-2xl bg-muted")} />;
}
