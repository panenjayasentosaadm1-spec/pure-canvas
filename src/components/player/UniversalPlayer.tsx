import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { resolveSource, type ResolvedSource } from "@/lib/source-resolver";
import { Button } from "@/components/ui/button";

interface PlayerProps {
  embedUrl: string;
  title: string;
}

type PlayerError = { message: string; hint?: string };

const ERROR_TEXT: Record<string, PlayerError> = {
  "invalid-url": { message: "Link sumber video tidak valid." },
  "not-https": { message: "Sumber video harus menggunakan HTTPS." },
  credentials: { message: "Link sumber tidak boleh berisi nama pengguna atau kata sandi." },
  placeholder: { message: "Video belum tersedia." },
  network: { message: "Gagal memuat video. Periksa koneksi atau sumber video." },
  "media-format": {
    message: "Format atau codec video tidak didukung oleh browser ini.",
    hint: "Coba browser lain atau buka sumbernya langsung.",
  },
  "media-src": {
    message: "Sumber video tidak dapat diputar.",
    hint: "Server mungkin menolak akses (CORS) atau berkas tidak tersedia.",
  },
  drm: {
    message: "Video dilindungi DRM dan tidak dapat diputar oleh pemutar ini.",
    hint: "Gunakan URL embed resmi dari penyedia video.",
  },
  "embed-blocked": {
    message: "Penyedia mungkin menolak pemutaran lewat embed.",
    hint: "Gunakan URL embed resmi penyedia, atau buka sumbernya langsung.",
  },
};

const FALLBACK_ERROR: PlayerError = { message: "Video tidak dapat diputar." };

function errText(key: string): PlayerError {
  return ERROR_TEXT[key] ?? FALLBACK_ERROR;
}

function PlayerFailure({ error, source, onRetry }: { error: PlayerError; source: ResolvedSource; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-medium text-foreground">{error.message}</p>
      {error.hint && <p className="max-w-md text-sm text-muted-foreground">{error.hint}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onRetry}><RotateCcw />Coba lagi</Button>
        <Button asChild variant="ghost" size="sm">
          <a href={source.url} target="_blank" rel="noopener noreferrer"><ExternalLink />Buka sumber</a>
        </Button>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="animate-spin" />Memuat video…
    </div>
  );
}

function IframeEngine({ source, title, onError }: { source: ResolvedSource; title: string; onError: (e: PlayerError) => void }) {
  const [loading, setLoading] = useState(true);
  const isYoutube = source.kind === "youtube";
  return (
    <>
      {loading && <div className="absolute inset-0"><Loading /></div>}
      <iframe
        src={source.playUrl}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        allow={isYoutube ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" : "fullscreen; encrypted-media; picture-in-picture"}
        allowFullScreen
        onLoad={() => setLoading(false)}
        onError={() => onError(errText("embed-blocked"))}
        className="h-full w-full border-0"
      />
    </>
  );
}

function mapMediaError(code: number | undefined): PlayerError {
  switch (code) {
    case MediaError.MEDIA_ERR_NETWORK: return errText("network");
    case MediaError.MEDIA_ERR_DECODE: return errText("media-format");
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: return errText("media-src");
    default: return errText("media-src");
  }
}

function DirectEngine({ source, onError }: { source: ResolvedSource; onError: (e: PlayerError) => void }) {
  return (
    <video
      key={source.playUrl}
      src={source.playUrl}
      controls
      playsInline
      preload="metadata"
      className="h-full w-full bg-black"
      onError={(event) => onError(mapMediaError(event.currentTarget.error?.code))}
    />
  );
}

function HlsEngine({ source, onError }: { source: ResolvedSource; onError: (e: PlayerError) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let destroyed = false;
    let hls: import("hls.js").default | null = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = source.playUrl;
    } else {
      let cancelled = false;
      void import("hls.js").then(({ default: Hls }) => {
        if (cancelled || destroyed) return;
        if (!Hls.isSupported()) { onError(errText("media-format")); return; }
        hls = new Hls({ enableWorker: true });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) onError(errText("network"));
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) onError(errText("media-format"));
          else onError(errText("media-src"));
        });
        hls.loadSource(source.playUrl);
        hls.attachMedia(video);
      }).catch(() => { if (!cancelled) onError(errText("media-format")); });
    }

    const onPlaying = () => setLoading(false);
    const onVideoError = () => onError(mapMediaError(video.error?.code));
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onVideoError);
    return () => {
      destroyed = true;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onVideoError);
      hls?.destroy();
    };
  }, [source.playUrl, onError]);

  return (
    <>
      {loading && <div className="absolute inset-0"><Loading /></div>}
      <video ref={videoRef} controls playsInline className="h-full w-full bg-black" />
    </>
  );
}

function DashEngine({ source, onError }: { source: ResolvedSource; onError: (e: PlayerError) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let player: import("dashjs").MediaPlayerClass | null = null;
    let cancelled = false;

    void import("dashjs").then((dashjs) => {
      if (cancelled) return;
      player = dashjs.MediaPlayer().create();
      player.on(dashjs.MediaPlayer.events.ERROR, (event) => {
        const code = (event as { error?: { code?: number } }).error?.code;
        if (code === 25 || code === 27) onError(errText("drm")); // key session / key system access
        else onError(errText("media-src"));
      });
      player.initialize(video, source.playUrl, false);
    }).catch(() => { if (!cancelled) onError(errText("media-format")); });

    const onPlaying = () => setLoading(false);
    const onVideoError = () => onError(mapMediaError(video.error?.code));
    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onVideoError);
    return () => {
      cancelled = true;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onVideoError);
      player?.destroy();
    };
  }, [source.playUrl, onError]);

  return (
    <>
      {loading && <div className="absolute inset-0"><Loading /></div>}
      <video ref={videoRef} controls playsInline className="h-full w-full bg-black" />
    </>
  );
}

/**
 * Universal video player: resolves the saved source URL once and renders the
 * matching engine. Remounts (via key) on source change or manual retry, so
 * engines never reload-loop.
 */
export function UniversalPlayer({ embedUrl, title }: PlayerProps) {
  const source = resolveSource(embedUrl);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<PlayerError | null>(
    source.kind === "invalid" ? errText(source.reason ?? "invalid-url") : null,
  );

  useEffect(() => {
    setAttempt(0);
    setError(source.kind === "invalid" ? errText(source.reason ?? "invalid-url") : null);
  }, [embedUrl, source.kind, source.reason]);

  const retry = () => { setError(null); setAttempt((n) => n + 1); };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-card">
      {error ? (
        <PlayerFailure error={error} source={source} onRetry={retry} />
      ) : (
        <div key={`${source.playUrl}#${attempt}`} className="h-full w-full">
          {source.kind === "direct" && <DirectEngine source={source} onError={setError} />}
          {source.kind === "hls" && <HlsEngine source={source} onError={setError} />}
          {source.kind === "dash" && <DashEngine source={source} onError={setError} />}
          {(source.kind === "iframe" || source.kind === "youtube") && <IframeEngine source={source} title={title} onError={setError} />}
        </div>
      )}
    </div>
  );
}
