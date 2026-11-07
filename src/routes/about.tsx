import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";
import { canonicalHead } from "@/lib/head-meta";

export const Route = createFileRoute("/about")({
  staticData: { sitemap: true },
  head: () => {
    const canonical = canonicalHead("/about");
    return { meta: [
      { title: "Tentang UsagiNime — Temukan Dunia Anime Favoritmu" },
      { name: "description", content: "UsagiNime hadir untuk para penggemar anime. Jelajahi berbagai judul anime subtitle Indonesia, mulai dari rilisan terbaru hingga serial favorit sepanjang masa." },
      { property: "og:title", content: "Tentang UsagiNime — Temukan Dunia Anime Favoritmu" },
      { property: "og:description", content: "UsagiNime hadir untuk para penggemar anime. Jelajahi berbagai judul anime subtitle Indonesia, mulai dari rilisan terbaru hingga serial favorit sepanjang masa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...canonical.meta,
    ], links: [...canonical.links] };
  },
  component: () => <PlaceholderPage title="Tentang" text="UsagiNime adalah blog anime. Semua video disematkan dari sumber eksternal — kami tidak mengunggah atau menyimpan berkas video sendiri." />,
});
