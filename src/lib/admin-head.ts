export function adminHead(title: string, description = "Kelola katalog anime UsagiNime.") {
  return { meta: [
    { title: `${title} - Admin UsagiNime` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} - Admin UsagiNime` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] };
}