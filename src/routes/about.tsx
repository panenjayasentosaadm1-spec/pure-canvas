import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { canonicalHead } from "@/lib/head-meta";

export const Route = createFileRoute("/about")({
  staticData: { sitemap: true },
  head: () => {
    const canonical = canonicalHead("/about");
    return {
      meta: [
        { title: "Tentang UsagiNime — Temukan Dunia Anime Favoritmu" },
        {
          name: "description",
          content:
            "Jelajahi berbagai anime subtitle Indonesia di UsagiNime. Temukan anime ongoing, tamat, movie, OVA, dan ONA dari beragam genre favorit.",
        },
        {
          property: "og:title",
          content: "Tentang UsagiNime — Temukan Dunia Anime Favoritmu",
        },
        {
          property: "og:description",
          content:
            "Jelajahi berbagai anime subtitle Indonesia di UsagiNime. Temukan anime ongoing, tamat, movie, OVA, dan ONA dari beragam genre favorit.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <main className="mx-auto w-full max-w-5xl py-10 sm:py-14">
        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            Mengenal UsagiNime
          </p>
          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Temukan Anime Favoritmu di UsagiNime!
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Dunia anime selalu punya cerita menarik untuk dinikmati. UsagiNime
            hadir untuk membantu kamu menemukan dan mengikuti berbagai anime
            favorit dengan subtitle Indonesia.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold">
            Satu Tempat untuk Menjelajahi Anime
          </h2>
          <p className="leading-7 text-muted-foreground">
            Dari petualangan penuh aksi, dunia fantasi yang menakjubkan, kisah
            romantis, hingga komedi yang menghibur, kamu bisa menjelajahi
            beragam judul anime dari berbagai genre. Temukan serial yang sedang
            tayang, selesaikan tontonan yang tertunda, atau cari kembali anime
            favorit sepanjang masa.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-5 text-2xl font-bold">Kenapa UsagiNime?</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <article className="rounded-xl border border-border p-5">
              <h3 className="mb-2 font-semibold">Koleksi Anime Beragam</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Jelajahi berbagai judul anime, mulai dari serial populer hingga
                tontonan yang mungkin belum pernah kamu temukan.
              </p>
            </article>

            <article className="rounded-xl border border-border p-5">
              <h3 className="mb-2 font-semibold">Update Episode Terbaru</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Ikuti anime ongoing dan temukan episode terbaru yang
                ditambahkan secara rutin.
              </p>
            </article>

            <article className="rounded-xl border border-border p-5">
              <h3 className="mb-2 font-semibold">Subtitle Indonesia</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Nikmati berbagai pilihan anime dengan subtitle Indonesia agar
                cerita lebih mudah diikuti.
              </p>
            </article>

            <article className="rounded-xl border border-border p-5">
              <h3 className="mb-2 font-semibold">Beragam Jenis Anime</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Temukan anime TV, movie, OVA, ONA, dan berbagai jenis tontonan
                lainnya.
              </p>
            </article>

            <article className="rounded-xl border border-border p-5 sm:col-span-2">
              <h3 className="mb-2 font-semibold">
                Mudah Menemukan Tontonan
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Jelajahi koleksi berdasarkan judul, genre, status, dan
                kategori untuk menemukan anime yang sesuai dengan seleramu.
              </p>
            </article>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card px-6 py-8 text-center sm:px-10">
          <h2 className="mb-3 text-2xl font-bold">
            Siap Menemukan Anime Berikutnya?
          </h2>
          <p className="mx-auto max-w-xl leading-7 text-muted-foreground">
            Selalu ada cerita baru untuk dijelajahi. Temukan anime yang kamu
            sukai dan nikmati pengalaman menjelajahi dunia anime bersama
            UsagiNime.
          </p>
        </section>
      </main>
    </SiteLayout>
  );
}
