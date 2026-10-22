/**
 * Centralized source resolver: classifies a saved episode embedUrl and picks
 * the playback engine. Pure and browser-safe so it can be unit tested and
 * reused by the admin "Tes video" preview.
 */

export type SourceKind =
  | "invalid"
  | "youtube"
  | "hls"
  | "dash"
  | "direct"
  | "iframe";

export interface ResolvedSource {
  kind: SourceKind;
  /** Original URL, unchanged. */
  url: string;
  /** Normalized URL the engine should load (provider embeds). */
  playUrl: string;
  /** MIME type hint for direct video files. */
  mimeType?: string;
  /** Human-readable reason when kind is "invalid". */
  reason?: string;
}

const DIRECT_MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "video/ogg",
  mov: "video/quicktime",
};

function extensionOf(pathname: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(pathname);
  return match ? match[1].toLowerCase() : "";
}

/** Extract a YouTube video id from watch/share/embed/shorts URL variations. */
export function youtubeVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const isYoutube =
    host === "youtu.be" ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube-nocookie.com");
  if (!isYoutube) return null;

  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v");
  } else {
    const match = /^\/(embed|shorts|live|v)\/([^/?#]+)/.exec(url.pathname);
    id = match ? match[2] : null;
  }
  return id && /^[\w-]{6,20}$/.test(id) ? id : null;
}

export function resolveSource(raw: string): ResolvedSource {
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { kind: "invalid", url: value, playUrl: value, reason: "invalid-url" };
  }

  if (url.protocol !== "https:") {
    return { kind: "invalid", url: value, playUrl: value, reason: "not-https" };
  }
  if (url.username || url.password) {
    return { kind: "invalid", url: value, playUrl: value, reason: "credentials" };
  }
  if (
    /(^|\.)(example\.(com|org|net)|contoh\.com)$/.test(url.hostname) ||
    /placeholder|belum-tersedia/i.test(url.href)
  ) {
    return { kind: "invalid", url: value, playUrl: value, reason: "placeholder" };
  }

  // Known providers win over extension-based guesses.
  const ytId = youtubeVideoId(url);
  if (ytId) {
    return {
      kind: "youtube",
      url: value,
      playUrl: `https://www.youtube-nocookie.com/embed/${ytId}`,
    };
  }

  const ext = extensionOf(url.pathname);
  if (ext === "m3u8") return { kind: "hls", url: value, playUrl: url.href };
  if (ext === "mpd") return { kind: "dash", url: value, playUrl: url.href };
  if (ext in DIRECT_MIME) {
    return { kind: "direct", url: value, playUrl: url.href, mimeType: DIRECT_MIME[ext] };
  }

  return { kind: "iframe", url: value, playUrl: url.href };
}
