import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageTitle } from "@/components/layout/SiteLayout";

export const Route = createFileRoute("/copyright")({
  head: () => ({ meta: [
    { title: "Hak Cipta / Penghapusan Konten — UsagiNime" },
    { name: "description", content: "Informasi hak cipta dan permintaan penghapusan konten UsagiNime." },
    { property: "og:title", content: "Hak Cipta / Penghapusan Konten — UsagiNime" },
    { property: "og:description", content: "Informasi hak cipta dan permintaan penghapusan konten UsagiNime." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <SiteLayout>
    <PageTitle title="Hak Cipta / Penghapusan Konten" />
    <p className="max-w-2xl text-muted-foreground">UsagiNime tidak menyimpan berkas video. Semua pemutar disematkan dari penyedia pihak ketiga.</p>
    <section className="mt-8 max-w-2xl"><h2 className="text-xl font-semibold">Permintaan penghapusan konten</h2>
      <p className="mt-2 text-muted-foreground">Jika Anda pemegang hak cipta, kirim tautan halaman terkait dan bukti kepemilikan hak ke <a href="mailto:email-kontak@contoh.com" className="text-primary hover:underline">email-kontak@contoh.com</a>. Kami akan meninjau permintaan dan menghapus sematan yang melanggar hak cipta.</p>
      <p className="mt-2 text-sm text-muted-foreground">Alamat kontak ini masih contoh dan harus diganti oleh pemilik situs.</p>
      <p className="mt-2 text-muted-foreground">Kami berupaya menanggapi dalam 7 hari. Batas waktu 7 hari ini masih contoh dan perlu dikonfirmasi oleh pemilik situs.</p>
    </section>
  </SiteLayout>,
});
