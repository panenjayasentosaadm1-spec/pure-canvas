import { describe, expect, it } from "vitest";
import { resolveSource, youtubeVideoId } from "@/lib/source-resolver";

describe("resolveSource", () => {
  it("rejects invalid and non-HTTPS URLs", () => {
    expect(resolveSource("not a url").kind).toBe("invalid");
    expect(resolveSource("http://cdn.example.com/v.mp4").reason).toBe("not-https");
    expect(resolveSource("https://user:pass@cdn.example.com/v.mp4").reason).toBe("credentials");
  });

  it("rejects placeholder and example domains", () => {
    expect(resolveSource("https://example.com/embed/1").reason).toBe("placeholder");
    expect(resolveSource("https://cdn.site.com/belum-tersedia").reason).toBe("placeholder");
  });

  it("classifies direct video files with MIME hints", () => {
    expect(resolveSource("https://cdn.site.com/ep1.mp4")).toMatchObject({ kind: "direct", mimeType: "video/mp4" });
    expect(resolveSource("https://cdn.site.com/ep1.webm")).toMatchObject({ kind: "direct", mimeType: "video/webm" });
    expect(resolveSource("https://cdn.site.com/ep1.ogv")).toMatchObject({ kind: "direct", mimeType: "video/ogg" });
  });

  it("classifies HLS and DASH including URLs with query parameters", () => {
    expect(resolveSource("https://cdn.site.com/live/master.m3u8?token=abc123").kind).toBe("hls");
    expect(resolveSource("https://cdn.site.com/vod/manifest.mpd?sig=xyz").kind).toBe("dash");
  });

  it("normalizes YouTube variations to the nocookie embed", () => {
    const embed = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
    expect(resolveSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ").playUrl).toBe(embed);
    expect(resolveSource("https://youtu.be/dQw4w9WgXcQ").playUrl).toBe(embed);
    expect(resolveSource("https://www.youtube.com/shorts/dQw4w9WgXcQ").playUrl).toBe(embed);
    expect(resolveSource("https://www.youtube.com/embed/dQw4w9WgXcQ").playUrl).toBe(embed);
  });

  it("falls back to iframe for other HTTPS embeds", () => {
    expect(resolveSource("https://player.contoh.tv/embed/abc").kind).toBe("iframe");
  });

  it("does not mistake provider URLs for file extensions", () => {
    expect(resolveSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ").kind).toBe("youtube");
  });
});

describe("youtubeVideoId", () => {
  it("rejects non-YouTube hosts and malformed ids", () => {
    expect(youtubeVideoId(new URL("https://notyoutube.com/watch?v=dQw4w9WgXcQ"))).toBeNull();
    expect(youtubeVideoId(new URL("https://www.youtube.com/watch?v=x"))).toBeNull();
    expect(youtubeVideoId(new URL("https://www.youtube.com/"))).toBeNull();
  });
});
