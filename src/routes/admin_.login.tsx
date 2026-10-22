import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSession, login } from "@/api/auth";

export const Route = createFileRoute("/admin_/login")({
  ssr: false,
  beforeLoad: async () => { if (await getSession()) throw redirect({ to: "/admin" }); },
  head: () => ({ meta: [
    { title: "Masuk - Admin UsagiNime" },
    { name: "description", content: "Masuk ke area admin demo UsagiNime." },
    { property: "og:title", content: "Masuk - Admin UsagiNime" },
    { property: "og:description", content: "Masuk ke area admin demo UsagiNime." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError(null);
    try { await login(email, password); await navigate({ to: "/admin" }); }
    catch (err) { setError(err instanceof Error ? err.message : "Gagal masuk"); }
    finally { setLoading(false); }
  }
  return <div className="flex min-h-screen items-center justify-center px-4">
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-3xl border border-border bg-card p-8">
      <div><Link to="/" className="font-display text-sm font-bold text-primary">UsagiNime</Link><h1 className="mt-2 text-2xl font-bold">Masuk admin</h1></div>
      <p className="text-sm text-muted-foreground">Masuk dengan akun admin yang sudah terdaftar.</p>
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="password">Kata sandi</Label><Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="hero" className="w-full" disabled={loading}>{loading ? "Sedang masuk…" : "Masuk"}</Button>
    </form>
  </div>;
}
