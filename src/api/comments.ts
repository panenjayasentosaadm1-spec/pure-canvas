import { supabase } from "@/integrations/supabase/client";

export const HIDDEN_PLACEHOLDER = "[Komentar ini telah disembunyikan oleh moderator]";

export interface PublicComment {
  id: string;
  parentId: string | null;
  authorName: string;
  content: string;
  isHidden: boolean;
  createdAt: string;
}

export interface ThreadItem {
  comment: PublicComment;
  depth: 0 | 1 | 2;
  /** Author being replied to when the real depth exceeds the visual limit. */
  mention: string | null;
}

export interface Thread {
  root: PublicComment;
  items: ThreadItem[];
}

/** True when the comments setup SQL has not been applied yet. */
export function isCommentsMissing(message: string): boolean {
  return /get_episode_comments|submit_guest_comment|admin_list_comments|episode_comments|schema cache|PGRST202|does not exist/i.test(message);
}

export const COMMENTS_UNAVAILABLE = "Fitur komentar belum diaktifkan oleh admin.";

export async function listEpisodeComments(episodeId: string): Promise<PublicComment[]> {
  const { data, error } = await supabase.rpc("get_episode_comments", { _episode_id: episodeId });
  if (error) throw new Error(isCommentsMissing(error.message) ? COMMENTS_UNAVAILABLE : `Gagal memuat komentar: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    parentId: row.parent_id,
    authorName: row.author_name,
    content: row.is_hidden ? HIDDEN_PLACEHOLDER : row.content,
    isHidden: row.is_hidden,
    createdAt: row.created_at,
  }));
}

/** Groups comments into root threads; nesting is capped at two visual levels. */
export function buildThreads(comments: PublicComment[]): Thread[] {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const children = new Map<string, PublicComment[]>();
  const roots: PublicComment[] = [];
  for (const c of comments) {
    if (c.parentId && byId.has(c.parentId)) {
      const list = children.get(c.parentId) ?? [];
      list.push(c);
      children.set(c.parentId, list);
    } else roots.push(c);
  }
  const byTime = (a: PublicComment, b: PublicComment) => a.createdAt.localeCompare(b.createdAt);
  roots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return roots.map((root) => {
    const items: ThreadItem[] = [];
    const walk = (parent: PublicComment, depth: number) => {
      for (const child of (children.get(parent.id) ?? []).sort(byTime)) {
        const visual = Math.min(depth, 2) as 1 | 2;
        items.push({ comment: child, depth: visual, mention: depth > 2 ? parent.authorName : null });
        walk(child, depth + 1);
      }
    };
    walk(root, 1);
    return { root, items };
  });
}

export interface CommentInput {
  episodeId: string;
  content: string;
  authorName?: string;
  email?: string;
  parentId?: string | null;
  honeypot?: string;
}

export function validateComment(input: CommentInput): string | null {
  const content = input.content.trim();
  if (content.length < 2 || content.length > 1000) return "Komentar harus 2–1000 karakter.";
  if ((input.authorName ?? "").trim().length > 50) return "Nama maksimal 50 karakter.";
  const email = (input.email ?? "").trim();
  if (email && (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) return "Format email tidak valid.";
  return null;
}

/** Ephemeral per-tab token; a secondary throttle key only, never a trusted identity. */
function clientToken(): string | null {
  try {
    const key = "usaginime-comment-token";
    let token = sessionStorage.getItem(key);
    if (!token) { token = crypto.randomUUID(); sessionStorage.setItem(key, token); }
    return token;
  } catch { return null; }
}

export async function submitComment(input: CommentInput): Promise<void> {
  const invalid = validateComment(input);
  if (invalid) throw new Error(invalid);
  const { error } = await supabase.rpc("submit_guest_comment", {
    _episode_id: input.episodeId,
    _content: input.content.trim(),
    _author_name: input.authorName?.trim() || null,
    _email: input.email?.trim() || null,
    _parent_id: input.parentId ?? null,
    _client_token: clientToken(),
    _honeypot: input.honeypot || null,
  });
  if (error) throw new Error(isCommentsMissing(error.message) ? COMMENTS_UNAVAILABLE : error.message);
}

export const episodeCommentsKey = (episodeId: string) => ["episode-comments", episodeId] as const;

// ---------- Admin ----------

export interface AdminComment {
  id: string;
  episodeId: string;
  parentId: string | null;
  authorName: string;
  email: string | null;
  content: string;
  status: "approved" | "hidden" | string;
  createdAt: string;
  animeId: string;
  animeTitle: string;
  episodeLabel: string;
}

export async function adminListComments(): Promise<AdminComment[]> {
  const { data, error } = await supabase.rpc("admin_list_comments");
  if (error) throw new Error(isCommentsMissing(error.message) ? "Tabel komentar belum tersedia. Jalankan docs/comments-setup.sql secara manual." : `Gagal memuat komentar: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id, episodeId: r.episode_id, parentId: r.parent_id, authorName: r.author_name, email: r.email,
    content: r.content, status: r.status, createdAt: r.created_at, animeId: r.anime_id, animeTitle: r.anime_title,
    episodeLabel: r.special_label ? r.special_label.toUpperCase() : `Episode ${r.episode_number ?? "?"}`,
  }));
}

export async function setCommentHidden(id: string, hidden: boolean): Promise<void> {
  const { error, count } = await supabase.from("episode_comments").update({ status: hidden ? "hidden" : "approved" }, { count: "exact" }).eq("id", id);
  if (error) throw new Error(`Gagal memperbarui komentar: ${error.message}`);
  if (count === 0) throw new Error("Komentar tidak ditemukan atau akses ditolak.");
}

export async function deleteComment(id: string): Promise<void> {
  const { error, count } = await supabase.from("episode_comments").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error(`Gagal menghapus komentar: ${error.message}`);
  if (count === 0) throw new Error("Komentar tidak ditemukan atau akses ditolak.");
}

/** Indonesian relative time, e.g. "5 menit lalu". */
export function relativeTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "baru saja";
  const steps: [number, string][] = [[60, "menit"], [3600, "jam"], [86400, "hari"], [604800, "minggu"], [2592000, "bulan"], [31536000, "tahun"]];
  let label = "menit", unit = 60;
  for (const [sec, l] of steps) if (s >= sec) { unit = sec; label = l; }
  return `${Math.floor(s / unit)} ${label} lalu`;
}

export function avatarHue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
