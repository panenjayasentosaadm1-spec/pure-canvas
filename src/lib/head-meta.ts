// Domain produksi situs. Sitemap (src/routes/sitemap[.]xml.ts) memakai nilai
// yang sama, jadi ganti keduanya bila domain berubah.
export const SITE_URL = "https://usaginime.online";

export interface CanonicalHead {
  meta: { property: "og:url"; content: string }[];
  links: { rel: "canonical"; href: string }[];
}

/**
 * og:url + canonical yang sama-sama mengarah ke URL halaman itu sendiri
 * (tanpa parameter query) untuk disebarkan di dalam head() tiap rute.
 */
export function canonicalHead(path: string): CanonicalHead {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [{ property: "og:url", content: url }],
    links: [{ rel: "canonical", href: url }],
  };
}
