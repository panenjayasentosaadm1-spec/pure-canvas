import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Image with a neutral placeholder when the source is empty or fails to load. */
export function SafeImage({ src, alt, className, loading = "lazy" }: { src?: string | null | undefined; alt: string; className?: string; loading?: "lazy" | "eager" }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) {
    return <div role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}><ImageOff className="size-1/3 max-h-10 max-w-10" /></div>;
  }
  return <img src={src} alt={alt} loading={loading} className={className} onError={() => setFailed(src)} />;
}
