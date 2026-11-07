import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { SiteLayout, PageTitle } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";

export function ResourceNotFound() {
  return <SiteLayout><PageTitle title="Konten tidak ditemukan" subtitle="Konten ini tidak ada atau belum diterbitkan." /><Button asChild variant="outline"><Link to="/">Kembali ke beranda</Link></Button></SiteLayout>;
}

export function ResourceError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return <SiteLayout><PageTitle title="Halaman gagal dimuat" /><Button onClick={async () => { await router.invalidate(); reset(); }}>Coba lagi</Button></SiteLayout>;
}