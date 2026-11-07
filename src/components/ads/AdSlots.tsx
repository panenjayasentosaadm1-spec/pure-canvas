import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { isAdActive, publicAdSlotsQuery, type AdSlotId, type AdSlotSettings } from "@/api/ad-slots";
import { bannerDocument, loadGlobalAd } from "@/lib/ad-runtime";

export function BannerAd({ id }: { id: Extract<AdSlotId, "homepage_banner_1" | "homepage_banner_2"> }) {
  const { data } = useQuery(publicAdSlotsQuery);
  const setting = data?.[id];
  if (!setting || !isAdActive(setting)) return null;
  return <BannerFrame key={setting.code} id={id} code={setting.code} />;
}

function BannerFrame({ id, code }: { id: AdSlotId; code: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    function resize(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.data?.channel !== id) return;
      const next: unknown = event.data.height;
      if (typeof next === "number" && Number.isFinite(next)) setHeight(Math.max(0, Math.min(1200, Math.ceil(next))));
    }
    window.addEventListener("message", resize);
    return () => window.removeEventListener("message", resize);
  }, [id]);
  return <div className="my-8 min-w-0 w-full max-w-full overflow-hidden" aria-label="Iklan">
    <iframe ref={frame} title="Iklan banner" className="block w-full max-w-full border-0" height={height} srcDoc={bannerDocument(code, id)} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerPolicy="strict-origin-when-cross-origin" />
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