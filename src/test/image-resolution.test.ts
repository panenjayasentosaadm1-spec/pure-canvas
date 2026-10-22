import { beforeEach, describe, expect, it, vi } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from } },
}));

import { getEpisodeThumbnailUrl } from "@/api/list-image";
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
