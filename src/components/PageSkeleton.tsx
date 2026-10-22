import { SiteLayout } from "@/components/layout/SiteLayout";
import { PosterGrid, PosterSkeleton } from "@/components/PosterCard";

/** Grid of poster skeleton cards. */
export function PosterGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <PosterGrid>
      {Array.from({ length: count }, (_, index) => <PosterSkeleton key={index} />)}
    </PosterGrid>
  );
}

/** Full-page loading state for client-only public pages. Never shows seed data. */
export function PageSkeleton({ variant = "grid" }: { variant?: "grid" | "detail" | "episode" }) {
  return (
    <SiteLayout>
      <div role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Memuat…</span>
        {variant === "grid" && (
          <>
            <div className="mb-8 h-9 w-48 animate-pulse rounded-md bg-muted" />
            <PosterGridSkeleton />
          </>
        )}
        {variant === "detail" && (
          <>
            <div className="mb-10 flex flex-col gap-6 md:flex-row">
              <div className="w-40 shrink-0 md:w-56"><div className="aspect-[2/3] animate-pulse rounded-2xl bg-muted" /></div>
              <div className="flex-1 space-y-3">
                <div className="h-9 w-2/3 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-5/6 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
            <PosterGridSkeleton count={5} />
          </>
        )}
        {variant === "episode" && (
          <>
            <div className="mb-6 h-9 w-2/3 animate-pulse rounded-md bg-muted" />
            <div className="aspect-video w-full animate-pulse rounded-md bg-muted" />
          </>
        )}
      </div>
    </SiteLayout>
  );
}
