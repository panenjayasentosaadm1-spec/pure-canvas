import { beforeEach, expect, it, vi } from "vitest";
import { saveEpisode, deleteEpisode } from "@/api/admin-episodes";
import { episodeInputSchema, nextEpisodeNumber, videoLinkError, type EpisodeInput } from "@/api/episode-validation";
import { resolveSource } from "@/lib/source-resolver";
import { playableEmbedUrl } from "@/lib/player";

const { from, responses, calls } = vi.hoisted(() => ({
  from: vi.fn(), responses: [] as Array<{ data: unknown; error: unknown }>,
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
}));
const { storageFrom, upload } = vi.hoisted(() => ({ storageFrom: vi.fn(), upload: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from, storage: { from: storageFrom } } }));
const input: EpisodeInput = { animeId: "a1", number: 7, specialLabel: null, title: "", embedUrl: "https://unregistered.video.test/embed/7", thumbnailUrl: "", isPublished: false };
const row = { id: "e1", anime_id: "a1", number: 7, special_label: null, title: "", embed_url: input.embedUrl, thumbnail_path: null, is_published: false, published_at: null, updated_at: "2026-10-22" };
function ok(data: unknown) { responses.push({ data, error: null }); }
beforeEach(() => {
  vi.clearAllMocks(); responses.length = 0; calls.length = 0;
  upload.mockResolvedValue({ error: null });
  storageFrom.mockImplementation((bucket: string) => ({ upload, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/storage/v1/object/public/${bucket}/${path}` } }) }));
  from.mockImplementation((table: string) => {
    const response = responses.shift();
    if (!response) throw new Error(`Unexpected database request: ${table}`);
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "neq", "limit", "maybeSingle", "single", "insert", "update", "delete"]) {
      chain[method] = (...args: unknown[]) => { calls.push({ table, method, args }); return chain; };
    }
    chain["then"] = (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve);
    return chain;
  });
});

it.each([
  ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
  ["https://unregistered.video.test/embed/7", "iframe"],
  ["https://new-cdn.test/video.mp4", "direct"],
  ["https://new-cdn.test/master.m3u8?token=abc", "hls"],
  ["https://new-cdn.test/manifest.mpd", "dash"],
])("accepts %s consistently in every URL layer as %s", (url, kind) => {
  expect(videoLinkError(url)).toBeUndefined();
  expect(episodeInputSchema.safeParse({ ...input, embedUrl: url }).success).toBe(true);
  expect(resolveSource(url).kind).toBe(kind);
  expect(playableEmbedUrl(url)).not.toBeNull();
});

it.each(["", "   ", "not a url", "https://", "https:video.test/embed", "http://video.test/embed", "javascript:alert(1)", "data:video/mp4;base64,AAAA", "ftp://video.test/video.mp4", "https://user:pass@video.test/embed", "https://example.com/embed", "https://cdn.example.org/video.mp4", "https://EXAMPLE.NET./embed", "https://video.test/placeholder", "https://video.test/belum-tersedia", '<iframe src="https://video.test/embed"></iframe>', '<script>alert(1)</script>', 'https://video.test/<script>', "https://video.test/one\ntwo"])("rejects unsafe source %j in every URL layer", (url) => {
  expect(videoLinkError(url)).toBeDefined();
  expect(episodeInputSchema.safeParse({ ...input, embedUrl: url }).success).toBe(false);
  expect(resolveSource(url).kind).toBe("invalid");
  expect(playableEmbedUrl(url)).toBeNull();
});

it.each([false, true])("saves an unregistered HTTPS domain with publication=%s without fetching domains", async (isPublished) => {
  ok({ id: "a1" }); ok([]); ok({ ...row, is_published: isPublished, published_at: isPublished ? "2026-10-22T02:06:00Z" : null });
  const saved = await saveEpisode({ ...input, isPublished });
  expect(saved.embedUrl).toBe(input.embedUrl);
  expect(saved.isPublished).toBe(isPublished);
  expect(from.mock.calls.map(([table]) => table)).toEqual(["anime", "episodes", "episodes"]);
  expect(calls.find((call) => call.method === "insert")?.args[0]).toMatchObject({ embed_url: input.embedUrl, is_published: isPublished });
});
it("rejects an unsafe source before any database request even when saving a draft", async () => {
  await expect(saveEpisode({ ...input, embedUrl: "https://user:pass@video.test/embed" })).rejects.toThrow("kata sandi");
  expect(from).not.toHaveBeenCalled();
});
it("preserves database authorization failures instead of falling back to mock storage", async () => {
  ok({ id: "a1" }); ok([]); responses.push({ data: null, error: { message: "permission denied", code: "42501" } });
  await expect(saveEpisode({ ...input, isPublished: true })).rejects.toThrow("permission denied");
});
it("publishes an existing draft from an unregistered domain", async () => {
  ok({ id: "a1" }); ok(row); ok([]); ok({ ...row, is_published: true, published_at: "2026-10-22T02:06:00Z" });
  expect((await saveEpisode({ ...input, isPublished: true }, "e1")).isPublished).toBe(true);
  expect(calls.find((call) => call.method === "update")?.args[0]).toMatchObject({ embed_url: input.embedUrl, is_published: true });
  expect(from).not.toHaveBeenCalledWith("allowed_embed_domains");
});
it("enforces duplicate episode numbers", async () => {
  ok({ id: "a1" }); ok([{ id: "other" }]);
  await expect(saveEpisode(input)).rejects.toThrow("Nomor episode sudah digunakan");
  expect(calls.some((call) => call.method === "insert")).toBe(false);
});
it("suggests the next number including drafts", () => {
  expect(nextEpisodeNumber([{ ...input, id: "draft", number: 12, publishedAt: "" }], input.animeId)).toBe(13);
});
it("preserves the existing publication time and poster fallback", async () => {
  const published_at = "2026-01-01T12:00:00Z";
  ok({ id: "a1" }); ok({ ...row, published_at }); ok([]); ok({ ...row, published_at });
  const saved = await saveEpisode(input, "e1");
  expect(saved.publishedAt).toBe(published_at);
  expect(saved.thumbnailUrl).toBeUndefined();
  expect(calls.find((call) => call.method === "update")?.args[0]).toMatchObject({ published_at, thumbnail_path: null });
});
it("deletes only the requested real database episode", async () => {
  ok(null); await deleteEpisode("e1");
  expect(calls).toContainEqual({ table: "episodes", method: "eq", args: ["id", "e1"] });
});
it("uploads optimized WebP thumbnails to the existing bucket and database field", async () => {
  ok({ id: "a1" }); ok([]); ok({ ...row, thumbnail_path: "episodes/new.webp" });
  const saved = await saveEpisode({ ...input, thumbnailUrl: "data:image/webp;base64,UklGRg==" });
  expect(storageFrom).toHaveBeenCalledWith("thumbnails");
  const [path, blob, options] = upload.mock.calls[0] ?? [];
  expect(path).toMatch(/^episodes\/.+\.webp$/);
  expect(blob.type).toBe("image/webp");
  expect(options).toMatchObject({ contentType: "image/webp", upsert: false });
  expect(calls.find(c => c.method === "insert")?.args[0]).toMatchObject({ thumbnail_path: path });
  expect(saved.thumbnailUrl).toContain("episodes/new.webp");
});
it("preserves the existing thumbnail object path when editing its display URL", async () => {
  ok({ id: "a1" }); ok({ ...row, thumbnail_path: "episodes/old.webp" }); ok([]); ok({ ...row, thumbnail_path: "episodes/old.webp" });
  await saveEpisode({ ...input, thumbnailUrl: "https://storage.test/storage/v1/object/public/thumbnails/episodes/old.webp" }, "e1");
  expect(upload).not.toHaveBeenCalled();
  expect(calls.find(c => c.method === "update")?.args[0]).toMatchObject({ thumbnail_path: "episodes/old.webp" });
});

it("saves a special episode with its label and no episode number", async () => {
  ok({ id: "a1" }); ok({ ...row, number: null, special_label: "ova" });
  const saved = await saveEpisode({ ...input, number: null, specialLabel: "ova" });
  expect(saved.specialLabel).toBe("ova");
  expect(saved.number).toBeNull();
  expect(calls.find(c => c.method === "insert")?.args[0]).toMatchObject({ special_label: "ova", number: null });
  expect(calls.some(c => c.method === "eq" && c.args[0] === "number")).toBe(false);
});
it("keeps the special label, null number, and existing thumbnail when editing a special episode", async () => {
  const existing = { ...row, id: "e9", number: null, special_label: "final", thumbnail_path: "episodes/keep.webp", is_published: true, published_at: "2026-10-01T00:00:00Z" };
  ok({ id: "a1" }); ok(existing); ok({ ...existing, updated_at: "2026-10-22" });
  const saved = await saveEpisode({ ...input, number: null, specialLabel: "final", thumbnailUrl: undefined, isPublished: true }, "e9");
  expect(saved.specialLabel).toBe("final");
  expect(saved.number).toBeNull();
  expect(saved.thumbnailUrl).toContain("episodes/keep.webp");
  const update = calls.find(c => c.method === "update")?.args[0];
  expect(update).toMatchObject({ special_label: "final", number: null, thumbnail_path: "episodes/keep.webp", published_at: existing.published_at });
  expect(upload).not.toHaveBeenCalled();
});
it("keeps the existing thumbnail path when the form does not change the image", async () => {
  ok({ id: "a1" }); ok({ ...row, thumbnail_path: "episodes/old.webp" }); ok([]); ok({ ...row, thumbnail_path: "episodes/old.webp" });
  await saveEpisode({ ...input, thumbnailUrl: undefined }, "e1");
  expect(upload).not.toHaveBeenCalled();
  expect(calls.find(c => c.method === "update")?.args[0]).toMatchObject({ thumbnail_path: "episodes/old.webp" });
});