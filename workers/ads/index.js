// UsagiNime Ads Worker (ads.usaginime.online). Deploy separately with Wrangler.
// Env vars: SUPABASE_URL, SUPABASE_ANON_KEY (public publishable key only).
const ALLOWED_SLOTS = new Set(["homepage_banner_1", "homepage_banner_2"]);
const PARENT_ORIGINS = ["https://usaginime.online", "https://www.usaginime.online"];
const FRAME_ANCESTORS = "https://usaginime.online https://www.usaginime.online https://*.lovable.app";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    if (url.pathname === "/" || url.pathname === "/health") return new Response("ok");
    const match = url.pathname.match(/^\/slot\/([a-z0-9_]+)$/);
    if (!match || !ALLOWED_SLOTS.has(match[1])) return new Response("Not found", { status: 404 });
    const slotId = match[1];
    // Only the version param is honoured; it just varies the cache key.
    const v = (url.searchParams.get("v") || "").replace(/[^a-z0-9]/g, "").slice(0, 16);
    const cacheKey = new Request(`${url.origin}/slot/${slotId}?v=${v}`);
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const key = env.SUPABASE_ANON_KEY;
    const headers = { apikey: key, Accept: "application/json" };
    if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`;
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/site_settings?id=eq.1&select=ad_slots`, { headers });
    if (!res.ok) return new Response("Upstream error", { status: 502 });
    const rows = await res.json();
    const slot = rows?.[0]?.ad_slots?.[slotId];
    const active = slot && slot.enabled === true && typeof slot.code === "string" && slot.code.trim();
    const response = new Response(active ? renderAdDocument(slot.code, slotId) : "<!doctype html><title>empty</title>", {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": `frame-ancestors ${FRAME_ANCESTORS}`,
        "Cache-Control": "public, max-age=0, must-revalidate, s-maxage=60",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};

function renderAdDocument(code, slotId) {
  const h = code.match(/['"]?height['"]?\s*:\s*['"]?(\d+)/i);
  const minHeight = h ? Math.min(1200, Math.max(50, parseInt(h[1], 10))) : 90;
  const channel = JSON.stringify(slotId).replace(/</g, "\\u003c");
  const origins = JSON.stringify(PARENT_ORIGINS);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;padding:0;width:100%;min-height:${minHeight}px;overflow-x:hidden}body{display:flex;justify-content:center}img,iframe,video{max-width:100%}</style>
</head><body>
${code}
<script>(()=>{
  const allowed=${origins};
  let target=null;
  try{const o=new URL(document.referrer).origin;if(allowed.includes(o)||/^https:\\/\\/[a-z0-9-]+\\.lovable\\.app$/.test(o))target=o;}catch(e){}
  if(!target||parent===window)return;
  const send=()=>parent.postMessage({channel:${channel},height:Math.max(${minHeight},document.body.scrollHeight)},target);
  if('ResizeObserver'in window)new ResizeObserver(send).observe(document.body);
  addEventListener('load',send);setTimeout(send,500);setTimeout(send,2000);send();
})();</script>
</body></html>`;
}
