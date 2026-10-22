import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, Film, PlaySquare, Tags, Globe, Settings, Menu, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/api/auth";

const navigation = [
  { to: "/admin", label: "Dasbor", icon: LayoutDashboard },
  { to: "/admin/anime", label: "Anime", icon: Film },
  { to: "/admin/episode", label: "Episode", icon: PlaySquare },
  { to: "/admin/tag", label: "Tag", icon: Tags },
  { to: "/admin/domain-embed", label: "Domain Embed", icon: Globe },
  { to: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
] as const;

export function AdminShell() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const title = navigation.find((item) => item.to === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(item.to))?.label ?? "Admin";
  async function signOut() {
    setBusy(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    await navigate({ to: "/admin/login", replace: true });
  }
  return <div className="min-h-screen bg-background text-foreground">
    {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-background/80 md:hidden" />}
    <aside aria-label="Navigasi admin" className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-border bg-sidebar p-5 transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="mb-10 flex items-center justify-between"><Link to="/admin" className="font-display text-2xl font-bold">Usagi<span className="text-primary">Nime</span></Link><Button variant="ghost" size="icon" aria-label="Tutup menu" className="md:hidden" onClick={() => setOpen(false)}><X /></Button></div>
      <p className="mb-3 text-xs font-semibold text-muted-foreground">RUANG ADMIN</p>
      <nav className="space-y-1">{navigation.map(({ to, label, icon: Icon }) => <Button asChild key={to} variant={label === title ? "secondary" : "ghost"} className="h-11 w-full justify-start"><Link to={to} onClick={() => setOpen(false)} aria-current={label === title ? "page" : undefined}><Icon />{label}</Link></Button>)}</nav>
      <Button asChild variant="outline" className="absolute bottom-6 left-5 right-5"><Link to="/">Lihat situs</Link></Button>
    </aside>
    <div className="min-w-0 md:pl-60"><header className="grid h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 md:px-8"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="shrink-0 md:hidden" aria-label="Buka menu" onClick={() => setOpen(true)}><Menu /></Button><span className="truncate font-semibold">{title}</span></div><Button variant="outline" onClick={signOut} disabled={busy}><LogOut />{busy ? "Sedang keluar…" : "Keluar"}</Button></header><main className="mx-auto min-w-0 w-full max-w-7xl p-4 py-8 md:p-8"><Outlet /></main></div>
  </div>;
}