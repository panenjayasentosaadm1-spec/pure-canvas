import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { isAdActive, publicAdSlotsQuery, type AdSlotId, type AdSlotSettings } from "@/api/ad-slots";
import { loadGlobalAd, parseBannerDimensions } from "@/lib/ad-runtime";

export function BannerAd({ id }: { id: Extract<AdSlotId, "homepage_banner_1" | "homepage_banner_2"> }) {
  const { data } = useQuery(publicAdSlotsQuery);
  const setting = data?.[id];
  if (!setting || !isAdActive(setting)) return null;
  return <BannerFrame key={setting.code} id={id} code={setting.code} />;
}

/** Dedicated ads origin: a separate host keeps ad scripts away from this site's storage and session. */
export const ADS_ORIGIN = "https://ads.usaginime.online";

/** Short stable hash of the ad code, so a saved change produces a fresh Worker cache key. */
export function adCodeVersion(code: string): string {
  let h = 5381;
  for (let i = 0; i < code.length; i++) h = ((h << 5) + h + code.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function BannerFrame({ id, code }: { id: AdSlotId; code: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const initial = parseBannerDimensions(code);
  const [height, setHeight] = useState(initial.height);
  const src = `${ADS_ORIGIN}/slot/${id}?v=${adCodeVersion(code)}`;
  useEffect(() => {
    function resize(event: MessageEvent) {
      if (event.origin !== ADS_ORIGIN) return;
      if (event.source !== frame.current?.contentWindow) return;
      const data: unknown = event.data;
      if (typeof data !== "object" || data === null || (data as { channel?: unknown }).channel !== id) return;
      const next = (data as { height?: unknown }).height;
      if (typeof next === "number" && Number.isFinite(next)) setHeight(Math.max(50, Math.min(1200, Math.ceil(next))));
    }
    window.addEventListener("message", resize);
    return () => window.removeEventListener("message", resize);
  }, [id]);
  // Cross-origin src: allow-same-origin keeps the frame's own ads origin (needed by
  // Adsterra's nested frame) and never grants access to this site's origin.
  return <div className="my-8 flex min-w-0 w-full max-w-full justify-center overflow-hidden" style={{ minHeight: initial.height }} aria-label="Iklan">
    <iframe ref={frame} title="Iklan banner" className="block w-full max-w-full border-0" style={{ maxWidth: initial.width }} height={height} src={src} loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms" referrerPolicy="strict-origin-when-cross-origin" />
  </div>;
}

export function GlobalAds() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isPublic = pathname !== "/admin" && !pathname.startsWith("/admin/");
  const { data } = useQuery({ ...publicAdSlotsQuery, enabled: isPublic });
  // Remain mounted outside Outlet, so changing episodes never recreates tags.
  return <><GlobalSlot id="social_bar" data={data} active={isPublic} /><GlobalSlot id="popunder" data={data} active={isPublic} /></>;
}

function GlobalSlot({ id, data, active }: { id: "social_bar" | "popunder"; data?: AdSlotSettings | undefined; active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const setting = data?.[id];
  const enabled = active && !!setting && isAdActive(setting);
  useEffect(() => {
    if (!enabled || !setting || !host.current) return;
    loadGlobalAd(id, setting, host.current);
  }, [id, setting, enabled]);
  // Hiding/disabling a running third-party script cannot undo its side effects;
  // a full refresh applies disabling to those scripts, without duplicate loads.
  return <div ref={host} data-ad-slot={id} hidden={!enabled} className={enabled ? "contents" : "hidden"} />;
}