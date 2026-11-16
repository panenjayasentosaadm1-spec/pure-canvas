import { resolveSource } from "./source-resolver";

/** Share the exact URL security rules used by admin and playback. */
export function playableEmbedUrl(value: string): string | null {
  const source = resolveSource(value);
  return source.kind === "invalid" ? null : new URL(source.url).href;
}