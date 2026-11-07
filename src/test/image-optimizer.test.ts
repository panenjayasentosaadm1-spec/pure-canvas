import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { optimizeImage, optimizedDimensions, WEBP_QUALITY } from "@/lib/image-optimizer";
import { cropPoster } from "@/lib/poster-upload";
import { cropThumbnail } from "@/lib/thumbnail-upload";

const webp = "data:image/webp;base64,UklGRg==";
const png = "data:image/png;base64,iVBORw==";
let encode: ReturnType<typeof vi.spyOn>;
let drawImage: ReturnType<typeof vi.fn>;
let revoke: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("Image", class { src = ""; naturalWidth = 1200; naturalHeight = 1800; async decode() {} });
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:image-test");
  revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(webp);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const file = () => new File(["image"], "poster.png", { type: "image/png" });

describe("browser image optimization", () => {
  it("fits within 600x900 preserving ratio and never enlarging", () => {
    expect(optimizedDimensions(1200, 1800)).toEqual({ width: 600, height: 900 });
    expect(optimizedDimensions(1200, 800)).toEqual({ width: 600, height: 400 });
    expect(optimizedDimensions(600, 2400)).toEqual({ width: 225, height: 900 });
    expect(optimizedDimensions(200, 300)).toEqual({ width: 200, height: 300 });
  });
  it.each(["image/jpeg", "image/png", "image/webp"])("converts %s to WebP at quality 0.83", async (type) => {
    const result = await optimizeImage(new File(["image"], "poster", { type }));
    expect(result).toMatchObject({ dataUrl: webp, width: 600, height: 900, bytes: 4 });
    expect(encode).toHaveBeenCalledWith("image/webp", 0.83);
    expect(WEBP_QUALITY).toBe(0.83);
    expect(drawImage.mock.calls[0]?.slice(1)).toEqual([0, 0, 600, 900]);
    expect(revoke).toHaveBeenCalledWith("blob:image-test");
  });
  it("falls back to transparent PNG without painting an opaque background", async () => {
    encode.mockReturnValue(png);
    expect((await optimizeImage(file())).dataUrl).toBe(png);
    expect(encode).toHaveBeenLastCalledWith("image/png");
    // An untouched alpha-enabled context plus drawImage retains source transparency.
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith("2d");
    expect(drawImage).toHaveBeenCalledTimes(1);
  });
  it("keeps quality at least 0.80 even if the 200 KB target is not achievable", async () => {
    const large = `data:image/webp;base64,${"A".repeat(300000)}`;
    encode.mockReturnValueOnce(large).mockReturnValueOnce(large);
    expect((await optimizeImage(file())).bytes).toBeGreaterThan(200 * 1024);
    expect(encode.mock.calls).toEqual([["image/webp", 0.83], ["image/webp", 0.80]]);
  });
  it.each(["text/plain", "video/mp4", "image/svg+xml"])("rejects unsupported %s before decoding", async (type) => {
    await expect(optimizeImage(new File(["bad"], "bad", { type }))).rejects.toThrow("Format tidak didukung");
    expect(drawImage).not.toHaveBeenCalled();
  });
  it("rejects GIF explicitly so animation is not discarded", async () => {
    await expect(optimizeImage(new File(["GIF89a"], "animated.gif", { type: "image/gif" }))).rejects.toThrow("animasi tidak hilang");
    expect(encode).not.toHaveBeenCalled();
  });
  it("rejects files over the existing 5 MB limit", async () => {
    await expect(optimizeImage(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }))).rejects.toThrow("5 MB");
    expect(encode).not.toHaveBeenCalled();
  });
  it("reports conversion failure and releases the source URL", async () => {
    encode.mockImplementation(() => { throw new Error("encoding failed"); });
    await expect(optimizeImage(file())).rejects.toThrow("Gambar gagal dioptimalkan");
    expect(revoke).toHaveBeenCalled();
  });
  it("reports undecodable images without replacing the previous image", async () => {
    vi.stubGlobal("Image", class { src = ""; async decode() { throw new Error("invalid"); } });
    await expect(optimizeImage(file())).rejects.toThrow("Gambar gagal dioptimalkan");
    expect(drawImage).not.toHaveBeenCalled();
    expect(revoke).toHaveBeenCalled();
  });
  it("rejects empty canvas output", async () => {
    encode.mockReturnValue("data:,");
    await expect(optimizeImage(file())).rejects.toThrow("Gambar gagal dioptimalkan");
  });
  it("uses the same optimizer through both existing upload entry points", async () => {
    expect((await cropPoster(file())).dataUrl).toBe(webp);
    expect((await cropThumbnail(file())).dataUrl).toBe(webp);
    expect(drawImage).toHaveBeenCalledTimes(2);
  });
});