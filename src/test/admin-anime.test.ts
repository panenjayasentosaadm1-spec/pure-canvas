import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTag, deleteAnime, saveAnime, setAnimePublished } from "@/api/admin";
import { animeInputSchema, slugify, type AnimeInput } from "@/api/admin-validation";
import { getAnimeBySlug, listAnime } from "@/api/anime";
import { getDb, updateDb, type MockDb } from "@/api/store";
import { POSTER_JPEG_QUALITY, resizedPosterDimensions, resizePoster } from "@/lib/poster-upload";

const input: AnimeInput = {
  title: "Anime uji", slug: "anime-uji", synopsis: "", posterUrl: "", type: "tv",
  status: "ongoing", season: "", year: 2026, tagIds: [], isPublished: false,
};
let original: MockDb;

beforeEach(() => { original = structuredClone(getDb()); });
afterEach(() => {
  vi.restoreAllMocks();
  updateDb((candidate) => Object.assign(candidate, original));
});

describe("Admin anime rules", () => {
  it("saves optional metadata and keeps drafts off public reads until published", async () => {
    const saved = await saveAnime({ ...input, altTitle: "Judul lain", studio: "Studio uji", rating: 0, durationMinutes: 24, totalEpisodes: 12 });
    expect(saved).toMatchObject({ altTitle: "Judul lain", studio: "Studio uji", rating: 0, durationMinutes: 24, totalEpisodes: 12 });
    expect(await getAnimeBySlug(saved.slug)).toBeNull();
    expect((await listAnime()).some((anime) => anime.id === saved.id)).toBe(false);
    await setAnimePublished(saved.id, true);
    expect((await getAnimeBySlug(saved.slug))?.id).toBe(saved.id);
    await setAnimePublished(saved.id, false);
    expect(await getAnimeBySlug(saved.slug)).toBeNull();
  });

  it("allows editing an existing slug but rejects duplicate slugs", async () => {
    const saved = await saveAnime(input);
    await expect(saveAnime(input)).rejects.toThrow();
    expect((await saveAnime({ ...input, title: "Judul diperbarui" }, saved.id)).title).toBe("Judul diperbarui");
  });

  it("deletes associated episodes when an anime is deleted", async () => {
    const id = "anime-langit-awan";
    expect(getDb().episodes.filter((episode) => episode.animeId === id).length).toBeGreaterThan(0);
    await deleteAnime(id);
    expect(getDb().anime.some((anime) => anime.id === id)).toBe(false);
    expect(getDb().episodes.some((episode) => episode.animeId === id)).toBe(false);
  });

  it("keeps live state unchanged if storage is full", async () => {
    const before = structuredClone(getDb());
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Quota", "QuotaExceededError"); });
    await expect(saveAnime(input)).rejects.toThrow();
    expect(getDb()).toEqual(before);
  });

  it("creates a tag that can be selected on an anime", async () => {
    const tag = await createTag("Genre uji");
    const anime = await saveAnime({ ...input, tagIds: [tag.id] });
    expect(anime.tagIds).toEqual([tag.id]);
    expect(getDb().tags.some((item) => item.id === tag.id)).toBe(true);
  });

  it("generates a normalized editable slug from a title", () => {
    expect(slugify("  Kisah Épisode: Baru!  ")).toBe("kisah-episode-baru");
  });

  it("restricts optional rating to the inclusive 0–10 range", () => {
    for (const rating of [undefined, 0, 10]) expect(animeInputSchema.safeParse({ ...input, rating }).success).toBe(true);
    for (const rating of [-0.1, 10.1]) expect(animeInputSchema.safeParse({ ...input, rating }).success).toBe(false);
  });
});

describe("Poster upload rules", () => {
  it("limits poster width to 400px without upscaling", () => {
    expect(resizedPosterDimensions(1200, 1800)).toEqual({ width: 400, height: 600 });
    expect(resizedPosterDimensions(200, 300)).toEqual({ width: 200, height: 300 });
  });

  it("encodes posters with JPEG quality 0.7", async () => {
    expect(POSTER_JPEG_QUALITY).toBe(0.7);
    vi.stubGlobal("Image", class { src = ""; naturalWidth = 1200; naturalHeight = 1800; async decode() {} });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: () => "blob:poster" });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: () => {} });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,test");
    try {
      await resizePoster(new File(["test"], "poster.png", { type: "image/png" }));
      expect(encode).toHaveBeenCalledWith("image/jpeg", 0.7);
      expect(drawImage.mock.calls[0]?.slice(5)).toEqual([0, 0, 400, 600]);
    } finally { vi.unstubAllGlobals(); }
  });

  it("rejects non-image uploads", async () => {
    await expect(resizePoster(new File(["text"], "file.txt", { type: "text/plain" }))).rejects.toThrow();
  });
});