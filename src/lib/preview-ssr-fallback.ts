// Graceful degradation khusus dev server Preview Lovable.
// `import.meta.env.DEV` diganti secara statis oleh Vite: true hanya di dev
// server, false di build produksi (Cloudflare), sehingga cabang ini hilang
// dari bundle produksi. Hanya berlaku saat render di server (SSR).
export function isPreviewDevServerRender(): boolean {
  return import.meta.env.DEV && typeof window === "undefined";
}

// Hanya error PGRST205 untuk tabel public.anime (pesan PostgREST dibungkus
// oleh lapisan API sehingga kodenya bisa hilang; cocokkan teks pesannya).
export function isMissingAnimeTableError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : String(error ?? "");
  const tableMissing = /could not find the table 'public\.anime' in the schema cache/i.test(message);
  return tableMissing && (code === undefined || code === "PGRST205");
}

export function shouldDeferSsrToClient(error: unknown): boolean {
  return isPreviewDevServerRender() && isMissingAnimeTableError(error);
}
