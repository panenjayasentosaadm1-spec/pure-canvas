import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { saveEpisode, deleteEpisode } from "@/api/admin-episodes";
import { nextEpisodeNumber, videoLinkError, type EpisodeInput } from "@/api/episode-validation";
import { getDb, updateDb, type MockDb } from "@/api/store";
import { resizeThumbnail, thumbnailDimensions } from "@/lib/thumbnail-upload";

let original: MockDb;
const input: EpisodeInput = { animeId: "anime-langit-awan", number: 7, title: "", embedUrl: "https://example.com/embed/belum-tersedia", thumbnailUrl: "", isPublished: false };
beforeEach(() => { original = structuredClone(getDb()); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); updateDb((candidate) => Object.assign(candidate, original)); });

it("suggests the next number including drafts", () => {
  expect(nextEpisodeNumber([...getDb().episodes, { ...input, thumbnailUrl: "", id: "draft", number: 12, publishedAt: "" }], input.animeId)).toBe(13);
});
it("enforces unique editable numbers per anime", async () => {
  const saved = await saveEpisode(input);
  await expect(saveEpisode(input)).rejects.toThrow("Nomor episode sudah digunakan untuk anime ini.");
  expect((await saveEpisode({ ...input, number: 8 }, saved.id)).number).toBe(8);
  expect((await saveEpisode({ ...input, animeId: "anime-pedang-senja" })).number).toBe(7);
});
it("requires HTTPS video links", () => {
  expect(videoLinkError("http://example.com/embed", [])).toBe("Link sumber video harus menggunakan HTTPS.");
  expect(videoLinkError("https://example.com/embed", [])).toBeUndefined();
});
it("matches allowed hostnames and their subdomains only", () => {
  expect(videoLinkError("https://player.youtube.com/embed/1", ["youtube.com"])).toBeUndefined();
  expect(videoLinkError("https://youtube.com.evil.test/embed", ["youtube.com"])).toBeDefined();
  expect(videoLinkError("https://evilyoutube.com/embed", ["youtube.com"])).toBeDefined();
});
it("allows seed video placeholders", () => {
  expect(getDb().episodes.every((episode) => !videoLinkError(episode.embedUrl, getDb().allowedEmbedDomains))).toBe(true);
});
it("sets publication time on first publication and preserves it", async () => {
  const draft = await saveEpisode(input);
  expect(draft.publishedAt).toBe("");
  const published = await saveEpisode({ ...input, isPublished: true }, draft.id);
  expect(Number.isFinite(Date.parse(published.publishedAt))).toBe(true);
  const updated = await saveEpisode({ ...input, isPublished: false }, draft.id);
  expect(updated.publishedAt).toBe(published.publishedAt);
  expect((await saveEpisode({ ...input, isPublished: true }, draft.id)).publishedAt).toBe(published.publishedAt);
});
it("stores poster fallback without duplicating the anime image", async () => {
  expect((await saveEpisode(input)).thumbnailUrl).toBe("");
});
it("limits thumbnail width to 600px without upscaling", () => {
  expect(thumbnailDimensions(1800, 1200)).toEqual({ width: 600, height: 400 });
  expect(thumbnailDimensions(320, 180)).toEqual({ width: 320, height: 180 });
});
it("encodes uploaded thumbnails as JPEG quality 0.7", async () => {
  vi.stubGlobal("Image", class { src = ""; naturalWidth = 1920; naturalHeight = 1080; async decode() {} });
  vi.stubGlobal("URL", class extends URL { static override createObjectURL() { return "blob:thumbnail"; } static override revokeObjectURL() {} });
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  const encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,test");
  expect(await resizeThumbnail(new File(["image"], "thumbnail.png", { type: "image/png" }))).toBe("data:image/jpeg;base64,test");
  expect(encode).toHaveBeenCalledWith("image/jpeg", 0.7);
  expect(drawImage.mock.calls[0]?.slice(5)).toEqual([0, 0, 600, 400]);
});
it("rejects invalid video domains inside the API", async () => {
  await expect(saveEpisode({ ...input, embedUrl: "https://not-allowed.test/embed" })).rejects.toThrow("Domain sumber video tidak diizinkan. Pilih domain yang terdaftar.");
});
it("persists uploaded data URLs through the API", async () => {
  expect((await saveEpisode({ ...input, thumbnailUrl: "data:image/jpeg;base64,test" })).thumbnailUrl).toBe("data:image/jpeg;base64,test");
});
it("deletes only the requested episode", async () => {
  const saved = await saveEpisode(input);
  await deleteEpisode(saved.id);
  expect(getDb().episodes.some((episode) => episode.id === saved.id)).toBe(false);
  expect(getDb().episodes.length).toBe(original.episodes.length);
});