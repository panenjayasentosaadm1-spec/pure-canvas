import { beforeEach, describe, expect, it, vi } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from } },
}));

import { getEpisodeThumbnailUrl } from "@/api/list-image";
import { posterDisplayUrl } from "@/api/storage-image";
import { toPosterCards } from "@/api/queries";
import type { Anime } from "@/api/types";

beforeEach(() => {
  from.mockReset();
  from.mockImplementation((bucket: string) => ({
    getPublicUrl: (path: string) => ({
      data: { publicUrl: `https://storage.test/object/public/${bucket}/${path}` },
    }),
  }));
});

const animeWithPoster = (posterUrl: string) =>
  ({ posterUrl } as unknown as Anime);

describe("episode thumbnail resolution", () => {
  it("resolves a Storage object path into a public thumbnails URL", () => {
    expect(getEpisodeThumbnailUrl("episodes/abc.jpg")).toBe(
      "https://storage.test/object/public/thumbnails/episodes/abc.jpg",
    );
    expect(from).toHaveBeenCalledWith("thumbnails");
  });

  it("keeps existing full image URLs unchanged", () => {
    expect(getEpisodeThumbnailUrl("https://img.test/thumb.jpg")).toBe(
      "https://img.test/thumb.jpg",
    );
    expect(from).not.toHaveBeenCalled();
  });

  it("returns no image for an empty path", () => {
    expect(getEpisodeThumbnailUrl(null)).toBeUndefined();
    expect(getEpisodeThumbnailUrl("")).toBeUndefined();
  });
});

describe("completed anime cards use the anime poster", () => {
  it("always maps the anime poster, never an episode thumbnail", () => {
    const card = toPosterCards([animeWithPoster("https://img.test/poster.jpg")])[0];
    expect(card?.imageUrl).toBe("https://img.test/poster.jpg");
  });

  it("yields no image when the anime has no poster", () => {
    const card = toPosterCards([animeWithPoster("")])[0];
    expect(card?.imageUrl).toBeUndefined();
  });
});

describe("poster display URL resolution", () => {
  it("resolves a Storage object path into a public posters URL", async () => {
    await expect(posterDisplayUrl("anime/abc.webp")).resolves.toBe(
      "https://storage.test/object/public/posters/anime/abc.webp",
    );
    expect(from).toHaveBeenCalledWith("posters");
  });

  it("keeps existing full image URLs unchanged", async () => {
    await expect(posterDisplayUrl("https://img.test/poster.jpg")).resolves.toBe(
      "https://img.test/poster.jpg",
    );
  });

  it("resolves to no image instead of throwing for a null path", async () => {
    await expect(posterDisplayUrl(null)).resolves.toBe("");
  });
});
