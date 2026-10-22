// Seed data for the mock store. All titles are fictional — no real anime.
// Posters and thumbnails are neutral generated SVG placeholders (gradients with text),
// served as data URIs so no external image host is needed.

import type { Anime, Episode, SiteSettings, Tag } from "./types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Neutral gradient placeholder image with centered text, as an SVG data URI. */
export function placeholderImage(
  width: number,
  height: number,
  text: string,
  hueA: number,
  hueB: number,
): string {
  const fontSize = Math.round(width / 14);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hueA} 45% 32%)"/><stop offset="1" stop-color="hsl(${hueB} 50% 18%)"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/><text x="50%" y="50%" fill="hsl(0 0% 100% / 0.85)" font-family="sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${escapeXml(text)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const poster = (text: string, hueA: number, hueB: number) => placeholderImage(400, 600, text, hueA, hueB);
const thumb = (text: string, hueA: number, hueB: number) => placeholderImage(640, 360, text, hueA, hueB);

// Placeholder embed URL — never a real video link. The player area shows
// a "Video belum tersedia" panel instead of loading this.
const EMBED_PLACEHOLDER = "https://example.com/embed/belum-tersedia";

export const seedTags: Tag[] = [
  { id: "tag-action", name: "Action", slug: "action" },
  { id: "tag-romance", name: "Romance", slug: "romance" },
  { id: "tag-comedy", name: "Comedy", slug: "comedy" },
  { id: "tag-fantasy", name: "Fantasy", slug: "fantasy" },
  { id: "tag-slice-of-life", name: "Slice of Life", slug: "slice-of-life" },
];

export const seedAnime: Anime[] = [
  {
    id: "anime-langit-awan",
    title: "Langit di Atas Negeri Awan",
    slug: "langit-di-atas-negeri-awan",
    synopsis:
      "Seorang gadis muda menemukan tangga tersembunyi menuju kerajaan di atas awan, tempat cuaca di dunia dibuat oleh para penenun langit. Ia harus belajar menenun badai sebelum musim kemarau panjang tiba.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Negeri Awan", 210, 260),
    status: "ongoing",
    type: "tv",
    season: "Spring",
    year: 2026,
    isPublished: true,
    tagIds: ["tag-fantasy", "tag-slice-of-life"],
    createdAt: "2026-03-02T09:00:00.000Z",
    updatedAt: "2026-10-12T09:00:00.000Z",
  },
  {
    id: "anime-pedang-senja",
    title: "Pedang Cahaya Senja",
    slug: "pedang-cahaya-senja",
    synopsis:
      "Di kota yang hanya disinari matahari terbenam abadi, seorang penempa pedang muda mewarisi bilah terakhir yang mampu memantulkan cahaya senja menjadi senjata melawan bayangan.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Pedang Senja", 15, 340),
    status: "ongoing",
    type: "tv",
    season: "Summer",
    year: 2026,
    isPublished: true,
    tagIds: ["tag-action", "tag-fantasy"],
    createdAt: "2026-05-14T09:00:00.000Z",
    updatedAt: "2026-10-15T09:00:00.000Z",
  },
  {
    id: "anime-kafe-kucing",
    title: "Kafe Kucing di Ujung Gang",
    slug: "kafe-kucing-di-ujung-gang",
    synopsis:
      "Kafe kecil yang hanya buka saat hujan, dijalankan oleh tiga kucing yang bisa berbicara dan seorang barista yang selalu lupa nama pelanggannya.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Kafe Kucing", 35, 90),
    status: "completed",
    type: "tv",
    season: "Winter",
    year: 2025,
    isPublished: true,
    tagIds: ["tag-slice-of-life", "tag-comedy"],
    createdAt: "2025-01-10T09:00:00.000Z",
    updatedAt: "2025-04-02T09:00:00.000Z",
  },
  {
    id: "anime-surat-hujan",
    title: "Surat untuk Hujan",
    slug: "surat-untuk-hujan",
    synopsis:
      "Setiap kali hujan turun, surat-surat lama yang tak pernah terkirim muncul di kotak pos seorang pustakawan. Ia memutuskan mengantarkan satu per satu, termasuk surat yang ditujukan untuk dirinya sendiri.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Surat Hujan", 230, 280),
    status: "completed",
    type: "movie",
    season: "Fall",
    year: 2025,
    isPublished: true,
    tagIds: ["tag-romance"],
    createdAt: "2025-08-20T09:00:00.000Z",
    updatedAt: "2025-09-01T09:00:00.000Z",
  },
  {
    id: "anime-robot-tua",
    title: "Robot Tua dan Bunga Matahari",
    slug: "robot-tua-dan-bunga-matahari",
    synopsis:
      "Robot penjaga kebun yang sudah lama ditinggalkan tuannya terus merawat satu baris bunga matahari, sampai seorang anak dari kota datang dan bertanya mengapa.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Robot Tua", 55, 140),
    status: "completed",
    type: "movie",
    season: "Summer",
    year: 2024,
    isPublished: true,
    tagIds: ["tag-slice-of-life"],
    createdAt: "2024-06-01T09:00:00.000Z",
    updatedAt: "2024-07-15T09:00:00.000Z",
  },
  {
    id: "anime-detektif-3b",
    title: "Detektif Kelas 3-B",
    slug: "detektif-kelas-3-b",
    synopsis:
      "Klub detektif kelas 3-B hanya menangani kasus-kasus kecil: bekal yang hilang, kapur tulis misterius, dan kursi yang berpindah sendiri. Sampai suatu hari kasus besar benar-benar datang.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Detektif 3-B", 160, 200),
    status: "ongoing",
    type: "tv",
    season: "Spring",
    year: 2026,
    isPublished: true,
    tagIds: ["tag-comedy"],
    createdAt: "2026-04-05T09:00:00.000Z",
    updatedAt: "2026-10-10T09:00:00.000Z",
  },
  {
    id: "anime-mercusuar",
    title: "Penjaga Mercusuar Bintang",
    slug: "penjaga-mercusuar-bintang",
    synopsis:
      "Di tepi langit malam berdiri mercusuar yang memandu bintang-bintang pulang. Penjaga barunya adalah seorang anak yang takut gelap.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Mercusuar", 260, 300),
    status: "upcoming",
    type: "movie",
    season: "Winter",
    year: 2027,
    isPublished: true,
    tagIds: ["tag-fantasy", "tag-romance"],
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "anime-laskar-langit",
    title: "Laskar Langit Ketujuh",
    slug: "laskar-langit-ketujuh",
    synopsis:
      "Tujuh penerbang muda dari akademi layang-layang tempur mempertahankan kota terapung terakhir dari armada badai. Persahabatan mereka diuji di setiap ketinggian.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Laskar Langit", 190, 240),
    status: "completed",
    type: "tv",
    season: "Fall",
    year: 2024,
    isPublished: true,
    tagIds: ["tag-action"],
    createdAt: "2024-09-12T09:00:00.000Z",
    updatedAt: "2024-12-20T09:00:00.000Z",
  },
  {
    id: "anime-melodi",
    title: "Melodi yang Tertinggal",
    slug: "melodi-yang-tertinggal",
    synopsis:
      "Seorang pemain biola jalanan menemukan partitur tua yang nada terakhirnya belum pernah selesai ditulis. Setiap kali ia memainkannya, seseorang di kota teringat sesuatu yang hilang.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Melodi", 300, 340),
    status: "ongoing",
    type: "tv",
    season: "Summer",
    year: 2026,
    isPublished: true,
    tagIds: ["tag-romance", "tag-slice-of-life"],
    createdAt: "2026-06-18T09:00:00.000Z",
    updatedAt: "2026-10-14T09:00:00.000Z",
  },
  {
    id: "anime-paman-kibo",
    title: "Petualangan Paman Kibo",
    slug: "petualangan-paman-kibo",
    synopsis:
      "Paman Kibo pensiun dari pekerjaannya sebagai kurir antarpulau dan malah menemukan peta menuju pulau yang tidak ada di peta mana pun.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Paman Kibo", 120, 170),
    status: "completed",
    type: "ova",
    season: "Spring",
    year: 2025,
    isPublished: false,
    tagIds: ["tag-comedy", "tag-fantasy"],
    createdAt: "2025-03-08T09:00:00.000Z",
    updatedAt: "2025-05-30T09:00:00.000Z",
  },
  {
    id: "anime-cermin",
    title: "Negeri di Balik Cermin",
    slug: "negeri-di-balik-cermin",
    synopsis:
      "Setiap cermin di rumah tua itu menunjukkan ruangan yang sama, kecuali satu. Di baliknya, waktu berjalan mundur dan semua orang tahu namanya.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Balik Cermin", 280, 320),
    status: "upcoming",
    type: "ona",
    season: "Winter",
    year: 2027,
    isPublished: false,
    tagIds: ["tag-fantasy"],
    createdAt: "2026-08-25T09:00:00.000Z",
    updatedAt: "2026-09-20T09:00:00.000Z",
  },
  {
    id: "anime-roti-bakar",
    title: "Turnamen Roti Bakar",
    slug: "turnamen-roti-bakar",
    synopsis:
      "Turnamen memanggang roti paling serius se-Jepang fiksi: delapan peserta, satu mesin pemanggang legendaris, dan wasit yang alergi roti.",
    altTitle: "Kisah dari Dunia Lain",
    studio: "Studio Usagi",
    rating: 8.2,
    durationMinutes: 24,
    totalEpisodes: 12,
    posterUrl: poster("Roti Bakar", 25, 60),
    status: "completed",
    type: "special",
    season: "Summer",
    year: 2025,
    isPublished: false,
    tagIds: ["tag-comedy"],
    createdAt: "2025-07-01T09:00:00.000Z",
    updatedAt: "2025-07-20T09:00:00.000Z",
  },
];

function makeEpisodes(
  animeId: string,
  slugPrefix: string,
  titles: string[],
  startDate: string,
  hueA: number,
  hueB: number,
  unpublishedFrom?: number,
): Episode[] {
  const start = new Date(startDate).getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return titles.map((title, i) => {
    const number = i + 1;
    return {
      id: `${animeId}-ep-${number}`,
      animeId,
      number,
      title,
      embedUrl: EMBED_PLACEHOLDER,
      thumbnailUrl: thumb(`${slugPrefix} ${number}`, hueA, hueB),
      isPublished: unpublishedFrom === undefined || number < unpublishedFrom,
      publishedAt: new Date(start + i * weekMs).toISOString(),
    };
  });
}

export const seedEpisodes: Episode[] = [
  ...makeEpisodes(
    "anime-langit-awan",
    "Negeri Awan",
    [
      "Tangga di Balik Awan",
      "Penenun Badai Pertama",
      "Hujan yang Salah Alamat",
      "Benang Warna Senja",
      "Kemarau Panjang Mulai",
      "Tenunan Terakhir",
    ],
    "2026-04-06T12:00:00.000Z",
    210,
    260,
  ),
  ...makeEpisodes(
    "anime-pedang-senja",
    "Pedang Senja",
    ["Kota Tanpa Pagi", "Bilah Terakhir", "Bayangan di Bengkel", "Pantulan Cahaya"],
    "2026-07-03T12:00:00.000Z",
    15,
    340,
    5,
  ),
  ...makeEpisodes(
    "anime-kafe-kucing",
    "Kafe Kucing",
    ["Buka Saat Hujan", "Pelanggan Tanpa Nama", "Resep Rahasia Kucing"],
    "2025-01-15T12:00:00.000Z",
    35,
    90,
  ),
  ...makeEpisodes(
    "anime-surat-hujan",
    "Surat Hujan",
    ["Kotak Pos Pustakawan", "Surat untuk Diri Sendiri"],
    "2025-09-05T12:00:00.000Z",
    230,
    280,
  ),
  ...makeEpisodes(
    "anime-robot-tua",
    "Robot Tua",
    ["Satu Baris Bunga", "Anak dari Kota"],
    "2024-07-01T12:00:00.000Z",
    55,
    140,
  ),
  ...makeEpisodes(
    "anime-detektif-3b",
    "Detektif 3-B",
    ["Bekal yang Hilang", "Kapur Tulis Misterius", "Kursi Berpindah", "Kasus Besar", "Tersangka Tak Terduga"],
    "2026-04-10T12:00:00.000Z",
    160,
    200,
    6,
  ),
  ...makeEpisodes("anime-laskar-langit", "Laskar Langit", ["Akademi Layang-Layang", "Armada Badai", "Ketinggian Tujuh"], "2024-10-02T12:00:00.000Z", 190, 240),
  ...makeEpisodes(
    "anime-melodi",
    "Melodi",
    ["Partitur Tua", "Nada yang Hilang", "Kota yang Terngiang", "Penantian Nada Terakhir"],
    "2026-07-12T12:00:00.000Z",
    300,
    340,
    5,
  ),
  ...makeEpisodes("anime-paman-kibo", "Paman Kibo", ["Peta Tanpa Pulau"], "2025-04-01T12:00:00.000Z", 120, 170),
  ...makeEpisodes("anime-roti-bakar", "Roti Bakar", ["Delapan Peserta", "Mesin Legendaris"], "2025-07-10T12:00:00.000Z", 25, 60),
];

export const seedSettings: SiteSettings = {
  siteName: "UsagiNime",
  tagline: "Sudut nyamanmu untuk anime.",
  logoUrl: null,
  footerText: "© 2026 UsagiNime. Semua video disematkan dari sumber eksternal.",
};

export const seedAllowedEmbedDomains = ["example.com", "youtube.com", "youtube-nocookie.com", "player.vimeo.com"];
