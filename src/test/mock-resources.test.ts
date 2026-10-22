import { afterEach, describe, expect, it } from "vitest";
import { getAnimeBySlug, listAnime } from "@/api/anime";
import { getEpisode, listEpisodesByAnime } from "@/api/episodes";
import { getDb } from "@/api/store";
import { getAdminCounts } from "@/api/admin";
import { playableEmbedUrl } from "@/lib/player";

describe("Published mock resources", () => {
  afterEach(() => {
    const episode = getDb().episodes.find((item) => item.id === "anime-langit-awan-ep-2");
    if (episode) episode.isPublished = true;
  });

  it("does not expose missing or unpublished anime", async () => {
    expect(await getAnimeBySlug("missing")).toBeNull();
    expect(await getAnimeBySlug("negeri-di-balik-cermin")).toBeNull();
    expect((await listAnime()).some((item) => !item.isPublished)).toBe(false);
  });

  it("omits unpublished episodes from reads and ordered navigation", async () => {
    const episode = getDb().episodes.find((item) => item.id === "anime-langit-awan-ep-2");
    if (!episode) throw new Error("Missing episode fixture");
    episode.isPublished = false;
    expect(await getEpisode("anime-langit-awan", 2)).toBeNull();
    expect((await listEpisodesByAnime("anime-langit-awan")).map((item) => item.number)).toEqual([1, 3, 4, 5, 6]);
  });

  it("counts all anime, episodes and unpublished drafts", async () => {
    expect(await getAdminCounts()).toEqual({ anime: 12, episodes: 32, drafts: 3 });
  });
});

describe("Episode embeds", () => {
  it("rejects placeholder embeds", () => {
    expect(playableEmbedUrl("https://example.com/embed/belum-tersedia")).toBeNull();
    expect(playableEmbedUrl("")).toBeNull();
    expect(playableEmbedUrl("javascript:alert(1)")).toBeNull();
  });
  it("accepts a real HTTPS embed", () => {
    expect(playableEmbedUrl("https://www.youtube-nocookie.com/embed/abc")).toBe("https://www.youtube-nocookie.com/embed/abc");
  });
});