
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "./admin-validation";
import type { SiteSettings } from "./types";

export async function renameTag(
  id: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  const slug = slugify(trimmed);

  if (!slug) {
    throw new Error("Nama genre wajib berisi huruf atau angka.");
  }

  const { data: existing, error: findError } = await supabase
    .from("tags")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .limit(1);

  if (findError) {
    throw new Error(`Gagal memeriksa genre: ${findError.message}`);
  }

  if (existing?.length) {
    throw new Error("Genre sudah tersedia.");
  }

  const { data, error } = await supabase
    .from("tags")
    .update({ name: trimmed, slug })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal mengubah genre: ${error.message}`);
  }

  if (!data) {
    throw new Error("Genre tidak ditemukan atau akses ditolak.");
  }
}

export async function deleteTag(id: string): Promise<void> {
  const { data: tag, error: findError } = await supabase
    .from("tags")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    throw new Error(`Gagal memeriksa genre: ${findError.message}`);
  }

  if (!tag) {
    throw new Error("Genre tidak ditemukan.");
  }

  const { error: relationError } = await supabase
    .from("anime_tags")
    .delete()
    .eq("tag_id", id);

  if (relationError) {
    throw new Error(
      `Gagal menghapus relasi genre: ${relationError.message}`,
    );
  }

  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Gagal menghapus genre: ${error.message}`);
  }
}

export function normalizeHostname(value: string): string | null {
  const raw = value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .split(/[/?#:]/)[0] ?? "";

  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(raw)
    ? raw
    : null;
}

export async function addEmbedDomain(value: string): Promise<string> {
  const host = normalizeHostname(value);

  if (!host) {
    throw new Error(
      "Masukkan nama domain yang valid, misalnya player.contoh.com.",
    );
  }

  const { data: existing, error: findError } = await supabase
    .from("allowed_embed_domains")
    .select("domain")
    .eq("domain", host)
    .limit(1);

  if (findError) {
    throw new Error(`Gagal memeriksa domain: ${findError.message}`);
  }

  if (existing?.length) {
    throw new Error("Domain sudah ada di daftar.");
  }

  const { error } = await supabase
    .from("allowed_embed_domains")
    .insert({ domain: host });

  if (error) {
    throw new Error(`Gagal menambahkan domain: ${error.message}`);
  }

  return host;
}

export async function removeEmbedDomain(host: string): Promise<void> {
  const normalized = normalizeHostname(host);

  if (!normalized) {
    throw new Error("Domain tidak valid.");
  }

  const { error } = await supabase
    .from("allowed_embed_domains")
    .delete()
    .eq("domain", normalized);

  if (error) {
    throw new Error(`Gagal menghapus domain: ${error.message}`);
  }
}

async function uploadSiteLogo(dataUrl: string): Promise<string> {
  const match = dataUrl.match(
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+=*)$/,
  );

  if (!match) {
    throw new Error("Logo harus berupa gambar JPEG, PNG, atau WebP yang valid.");
  }

  const mime = `image/${match[1]}`;
  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const blob = await (await fetch(dataUrl)).blob();

  if (blob.size > 1024 * 1024) {
    throw new Error("Ukuran logo maksimal 1 MB.");
  }

  const path = `logos/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("site")
    .upload(path, blob, {
      contentType: mime,
      upsert: false,
    });

  if (error) {
    throw new Error(`Gagal mengunggah logo: ${error.message}`);
  }

  return path;
}

export async function saveSettings(input: SiteSettings): Promise<void> {
  const siteName = input.siteName.trim();

  if (!siteName) {
    throw new Error("Nama situs wajib diisi.");
  }

  let logoPath: string | null = input.logoUrl || null;

  if (logoPath?.startsWith("data:")) {
    logoPath = await uploadSiteLogo(logoPath);
  } else if (
    logoPath &&
    !/^https?:\/\//i.test(logoPath) &&
    !/^[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|webp|svg)$/i.test(logoPath)
  ) {
    throw new Error("Path logo tidak valid.");
  }

  const { data, error } = await supabase
    .from("site_settings")
    .update({
      site_name: siteName,
      tagline: input.tagline.trim(),
      footer_text: input.footerText.trim(),
      logo_path: logoPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal menyimpan pengaturan situs: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "Pengaturan situs tidak ditemukan atau Anda tidak memiliki akses admin.",
    );
  }
}

export async function resetSampleData(): Promise<void> {
  throw new Error(
    "Reset data contoh belum tersedia untuk Supabase. Data tidak dihapus agar data anime asli tetap aman.",
  );
}
