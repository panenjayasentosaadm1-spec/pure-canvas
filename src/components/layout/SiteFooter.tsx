import { Link } from "@tanstack/react-router";
import { useSiteSettings } from "@/hooks/use-site-settings";

export function SiteFooter() {
  const { data } = useSiteSettings();
  return (
    <footer className="mt-16 border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p>{data?.footerText ?? "© UsagiNime"}</p>
        <nav className="flex gap-4">
          <Link to="/copyright" className="hover:text-foreground">Hak Cipta / Penghapusan Konten</Link>
          <Link to="/about" className="hover:text-foreground">Tentang</Link>
        </nav>
      </div>
    </footer>
  );
}
