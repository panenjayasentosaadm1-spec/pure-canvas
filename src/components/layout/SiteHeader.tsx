import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Menu, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/", label: "Beranda" },
  { to: "/terbaru", label: "Terbaru" },
  { to: "/anime", label: "Anime" },
  { to: "/genres", label: "Genre" },
] as const;

export function SiteHeader() {
  const { data } = useSiteSettings();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const name = data?.siteName ?? "UsagiNime";

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setOpen(false);
    navigate({ to: "/anime", search: q ? { q } : {} });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:flex">
        <Link to="/" className="flex min-w-0 items-center gap-2" onClick={() => setOpen(false)}>
          {data?.logoUrl ? (
            <img src={data.logoUrl} alt={`Logo ${name}`} loading="lazy" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary font-display text-lg font-bold text-primary-foreground">
              U
            </span>
          )}
          <span className="truncate font-display text-xl font-bold">{name}</span>
        </Link>

        <Button variant="ghost" size="icon" className="shrink-0 md:hidden" aria-label={open ? "Tutup menu" : "Buka menu"} aria-expanded={open} aria-controls="site-mobile-menu" onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</Button>

        <div id="site-mobile-menu" className={`${open ? "grid" : "hidden"} col-span-2 min-w-0 gap-3 md:flex md:flex-1 md:items-center`}>
        <nav aria-label="Navigasi utama" className="grid grid-cols-2 gap-1 md:ml-6 md:flex md:shrink-0">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={onSearch}
          className="flex min-w-0 w-full items-center gap-2 rounded-full border border-input bg-card px-3 py-1.5 text-sm text-muted-foreground md:ml-auto md:max-w-xs"
        >
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="search"
            placeholder="Cari anime..."
            aria-label="Cari anime"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </form>
        </div>
      </div>
    </header>
  );
}
