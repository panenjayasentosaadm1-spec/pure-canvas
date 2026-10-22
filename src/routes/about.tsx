import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/PlaceholderPage";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: "Tentang — UsagiNime" },
    { name: "description", content: "Tentang UsagiNime, blog episode anime." },
    { property: "og:title", content: "Tentang — UsagiNime" },
    { property: "og:description", content: "Tentang UsagiNime, blog episode anime." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <PlaceholderPage title="Tentang" text="UsagiNime adalah blog anime. Semua video disematkan dari sumber eksternal — kami tidak mengunggah atau menyimpan berkas video sendiri." />,
});
