import { useCallback, useEffect, useRef, useState } from "react";
import { FastForward, Maximize, Minimize, MoreVertical, Pause, Play, Rewind, Volume2, VolumeX, Check, Loader2 } from "lucide-react";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const HIDE_DELAY = 2500;

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

function lockLandscapeOrientation() {
  try {
    const orientation = window.screen.orientation as ScreenOrientation & {
      lock?: (value: "landscape") => Promise<void>;
    };
    if (typeof orientation?.lock === "function") {
      void orientation.lock("landscape").catch(() => undefined);
    }
  } catch {
    // Fullscreen remains available when the browser does not support orientation locking.
  }
}

function unlockScreenOrientation() {
  try {
    const orientation = window.screen.orientation as ScreenOrientation & {
      unlock?: () => void;
    };
    orientation?.unlock?.();
  } catch {
    // Ignore unsupported orientation APIs.
  }
}

interface Props {
  src: string;
  onError: (code: number | undefined) => void;
}

/** HTML5 video with custom controls (no native controls, no download menu). */
export function CustomVideoPlayer({ src, onError }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const seekFeedbackTimer = useRef<number | undefined>(undefined);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef<{ x: number; y: number; time: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const singleTapTimer = useRef<number | undefined>(undefined);
  const flashTimer = useRef<number | undefined>(undefined);
  const [flash, setFlash] = useState<"play" | "pause" | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<"backward" | "forward" | null>(null);

  const scheduleHide = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    const v = videoRef.current;
    if (!v || v.paused || v.ended) return;
    hideTimer.current = window.setTimeout(() => { setVisible(false); setMenuOpen(false); }, HIDE_DELAY);
  }, []);

  const reveal = useCallback(() => { setVisible(true); scheduleHide(); }, [scheduleHide]);

  useEffect(() => () => {
    window.clearTimeout(hideTimer.current);
    window.clearTimeout(seekFeedbackTimer.current);
    window.clearTimeout(singleTapTimer.current);
    window.clearTimeout(flashTimer.current);
    unlockScreenOrientation();
  }, []);

  useEffect(() => {
    const onFs = () => {
      const isFullscreen = document.fullscreenElement === wrapRef.current;
      setFullscreen(isFullscreen);
      if (!isFullscreen) unlockScreenOrientation();
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) void v.play().catch(() => undefined);
    else v.pause();
  };

  const toggleFromVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    setFlash(v.paused || v.ended ? "play" : "pause");
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 600);
    togglePlay();
  };

  /** Center zone: ~40% width x 50% height of the video area. */
  const isCenter = (x: number, y: number, b: DOMRect) =>
    x >= b.left + b.width * 0.3 && x <= b.left + b.width * 0.7 &&
    y >= b.top + b.height * 0.25 && y <= b.top + b.height * 0.75;

  const onVideoClick = (event: React.MouseEvent<HTMLVideoElement>) => {
    if (isCenter(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())) toggleFromVideo();
    else reveal();
  };

  const seek = (value: number) => {
    const v = videoRef.current;
    if (v && Number.isFinite(value)) { v.currentTime = value; setCurrent(value); }
  };

  const changeVolume = (value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = value;
    v.muted = value === 0;
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted && v.volume === 0) v.volume = 1;
    v.muted = !v.muted;
  };

  const changeRate = (value: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = value;
    setMenuOpen(false);
    reveal();
  };

  const toggleFullscreen = () => {
    const wrap = wrapRef.current;
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!wrap) return;
    if (document.fullscreenElement) { void document.exitFullscreen().catch(() => undefined); return; }
    if (wrap.requestFullscreen) {
      void wrap.requestFullscreen().then(() => {
        if (document.fullscreenElement === wrap) lockLandscapeOrientation();
      }).catch(() => undefined);
    }
    else v?.webkitEnterFullscreen?.();
  };

  const onVideoTouchStart = (event: React.TouchEvent<HTMLVideoElement>) => {
    if (event.touches.length !== 1) {
      touchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    if (!touch) {
      touchStart.current = null;
      return;
    }
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onVideoTouchEnd = (event: React.TouchEvent<HTMLVideoElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 24) {
      lastTap.current = null;
      return;
    }

    const now = Date.now();
    const previous = lastTap.current;
    if (previous && now - previous.time <= 320 && Math.hypot(touch.clientX - previous.x, touch.clientY - previous.y) <= 80) {
      lastTap.current = null;
      event.preventDefault();
      window.clearTimeout(singleTapTimer.current);

      const video = videoRef.current;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (!video || bounds.width === 0) return;

      const direction = touch.clientX < bounds.left + bounds.width / 2 ? "backward" : "forward";
      const delta = direction === "backward" ? -10 : 10;
      const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
      const maxTime = Number.isFinite(video.duration) ? video.duration : Number.POSITIVE_INFINITY;
      const nextTime = Math.max(0, Math.min(maxTime, currentTime + delta));
      video.currentTime = nextTime;
      setCurrent(nextTime);
      setSeekFeedback(direction);
      window.clearTimeout(seekFeedbackTimer.current);
      seekFeedbackTimer.current = window.setTimeout(() => setSeekFeedback(null), 800);
    } else {
      lastTap.current = { x: touch.clientX, y: touch.clientY, time: now };
      event.preventDefault();
      window.clearTimeout(singleTapTimer.current);
      reveal();
      // Only the center zone toggles playback; delay so a double-tap can cancel it.
      if (isCenter(touch.clientX, touch.clientY, event.currentTarget.getBoundingClientRect())) {
        singleTapTimer.current = window.setTimeout(toggleFromVideo, 320);
      }
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    const v = videoRef.current;
    if (!v || (e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
    else if (e.key === "ArrowRight") seek(Math.min(duration, v.currentTime + 5));
    else if (e.key === "ArrowLeft") seek(Math.max(0, v.currentTime - 5));
    else if (e.key === "f") toggleFullscreen();
    else if (e.key === "m") toggleMute();
    reveal();
  };

  const showControls = visible || !playing || menuOpen;
  const progress = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;
  const effectiveVolume = muted ? 0 : volume;

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={onKey}
      onPointerMove={reveal}
      onPointerDown={reveal}
      className={`group relative ${fullscreen ? "h-[100dvh] w-screen" : "h-full w-full"} select-none overflow-hidden bg-black outline-none ${showControls ? "" : "cursor-none"}`}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={onVideoTouchStart}
        onTouchEnd={onVideoTouchEnd}
        onClick={onVideoClick}
        onPlay={() => { setPlaying(true); scheduleHide(); }}
        onWaiting={(e) => { if (!e.currentTarget.paused) setBuffering(true); }}
        onPlaying={() => setBuffering(false)}
        onPause={() => { setPlaying(false); setBuffering(false); setVisible(true); }}
        onEnded={() => { setPlaying(false); setBuffering(false); setVisible(true); }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onProgress={(e) => {
          const b = e.currentTarget.buffered;
          if (b.length) setBuffered(b.end(b.length - 1));
        }}
        onVolumeChange={(e) => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted); }}
        onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
        onError={(e) => { setBuffering(false); onError(e.currentTarget.error?.code); }}
        className="h-full w-full touch-manipulation select-none bg-black object-contain [-webkit-touch-callout:none]"
      />

      {seekFeedback && (
        <div
          aria-live="polite"
          className={`pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 ${seekFeedback === "backward" ? "left-1/4" : "left-3/4"}`}
        >
          <div className="flex items-center gap-2 rounded-full bg-background/80 px-3 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur">
            {seekFeedback === "backward" ? <Rewind className="size-5" /> : <FastForward className="size-5" />}
            <span>{seekFeedback === "backward" ? "−10 detik" : "+10 detik"}</span>
          </div>
        </div>
      )}

      {buffering && playing && (
        <div role="status" aria-label="Memuat video" className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <Loader2 className="size-12 animate-spin text-primary sm:size-14" />
        </div>
      )}

      {!buffering && flash && playing === (flash === "play") && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg sm:size-16">
          {flash === "play" ? <Play className="ml-1 size-7 fill-current sm:size-8" /> : <Pause className="size-7 fill-current sm:size-8" />}
        </div>
      )}

      {!playing && !buffering && (
        <button
          type="button"
          aria-label="Putar"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg transition hover:scale-105 sm:size-16"
        >
          <Play className="ml-1 size-7 fill-current sm:size-8" />
        </button>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-2 pb-1.5 pt-8 text-foreground transition-opacity duration-300 sm:px-3 sm:pb-2 ${showControls ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className="relative flex h-5 items-center">
          <div className="pointer-events-none absolute inset-x-0 h-1 rounded-full bg-foreground/20">
            <div className="absolute inset-y-0 left-0 rounded-full bg-foreground/30" style={{ width: `${bufferedPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <input
            type="range"
            aria-label="Posisi video"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(e) => seek(Number(e.target.value))}
            className="[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary relative h-5 w-full cursor-pointer appearance-none bg-transparent"
          />
        </div>

        <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          <button type="button" aria-label={muted ? "Bunyikan" : "Bisukan"} onClick={toggleMute} className="flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-foreground/10">
            {effectiveVolume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.05}
            value={effectiveVolume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary hidden h-5 w-20 cursor-pointer appearance-none bg-transparent sm:block"
            style={{ background: `linear-gradient(to right, var(--primary) ${effectiveVolume * 100}%, color-mix(in oklab, var(--foreground) 25%, transparent) ${effectiveVolume * 100}%) center / 100% 4px no-repeat` }}
          />

          <span className="ml-1 min-w-0 truncate text-xs tabular-nums text-foreground/90 sm:text-sm">
            {formatTime(current)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <div className="relative">
              <button
                type="button"
                aria-label="Pengaturan kecepatan"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-9 items-center gap-0.5 rounded-md px-1.5 hover:bg-foreground/10"
              >
                {rate !== 1 && <span className="text-xs font-medium tabular-nums">{rate}x</span>}
                <MoreVertical className="size-5" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className={`absolute bottom-full right-0 z-20 mb-1 overflow-y-auto overscroll-contain rounded-md border border-border bg-popover/95 py-1 text-popover-foreground shadow-xl backdrop-blur ${
                    fullscreen
                      ? "max-h-[70vh] w-36"
                      : "max-h-[min(9rem,calc(var(--player-h,100vh)-4.5rem))] w-24 sm:max-h-64 sm:w-36"
                  }`}
                >
                  <p className={`px-3 py-1 text-muted-foreground ${fullscreen ? "text-xs" : "text-[10px] sm:text-xs"}`}>Kecepatan</p>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="menuitemradio"
                      aria-checked={rate === s}
                      onClick={() => changeRate(s)}
                      className={`flex w-full items-center justify-between hover:bg-accent hover:text-accent-foreground ${fullscreen ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm"}`}
                    >
                      {s === 1 ? "Normal" : `${s}x`}
                      {rate === s && <Check className={fullscreen ? "size-4 text-primary" : "size-3.5 text-primary sm:size-4"} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" aria-label={fullscreen ? "Keluar layar penuh" : "Layar penuh"} onClick={toggleFullscreen} className="flex size-9 items-center justify-center rounded-md hover:bg-foreground/10">
              {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
