/** Only real HTTPS embeds may be loaded into the sandboxed player. */
export function playableEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || /(^|\.)(example\.(com|org|net)|contoh\.com)$/.test(url.hostname) || /placeholder|belum-tersedia/i.test(url.href)) return null;
    return url.href;
  } catch {
    return null;
  }
}