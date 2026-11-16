import { validateImageFile, type CroppedImage } from "./image-crop";

export const OPTIMIZED_IMAGE_MAX_WIDTH = 600;
export const OPTIMIZED_IMAGE_MAX_HEIGHT = 900;
export const WEBP_QUALITY = 0.83;
export const MIN_WEBP_QUALITY = 0.80;
export const IMAGE_TARGET_BYTES = 200 * 1024;

export function optimizedDimensions(width: number, height: number) {
  const scale = Math.min(1, OPTIMIZED_IMAGE_MAX_WIDTH / width, OPTIMIZED_IMAGE_MAX_HEIGHT / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function encodedBytes(value: string) {
  const base64 = value.slice(value.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor(base64.length * 3 / 4) - padding;
}

/** Browser-only; keeps the entire image and its alpha channel, never crops or upscales. */
export async function optimizeImage(file: File): Promise<CroppedImage> {
  if (file.type === "image/gif" || /\.gif$/i.test(file.name)) {
    throw new Error("GIF tidak didukung agar animasi tidak hilang. Pilih gambar JPG, PNG, atau WebP.");
  }
  validateImageFile(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;
    if (!originalWidth || !originalHeight) throw new Error("Ukuran gambar tidak valid.");
    const { width, height } = optimizedDimensions(originalWidth, originalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Pemrosesan gambar tidak tersedia.");
    context.drawImage(image, 0, 0, width, height);
    let dataUrl = canvas.toDataURL("image/webp", WEBP_QUALITY);
    if (dataUrl.startsWith("data:image/webp;base64,") && encodedBytes(dataUrl) > IMAGE_TARGET_BYTES) {
      const smaller = canvas.toDataURL("image/webp", MIN_WEBP_QUALITY);
      if (smaller.startsWith("data:image/webp;base64,") && encodedBytes(smaller) < encodedBytes(dataUrl)) dataUrl = smaller;
    } else if (!dataUrl.startsWith("data:image/webp;base64,")) {
      // PNG is a lossless fallback that retains transparency on browsers without WebP encoding.
      dataUrl = canvas.toDataURL("image/png");
    }
    if (!/^data:image\/(webp|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl) || encodedBytes(dataUrl) <= 0) {
      throw new Error("Hasil optimasi tidak valid.");
    }
    return { dataUrl, fileName: file.name, originalWidth, originalHeight, originalBytes: file.size, width, height, bytes: encodedBytes(dataUrl) };
  } catch {
    throw new Error("Gambar gagal dioptimalkan. Coba unggah ulang gambar JPG, PNG, atau WebP yang valid.");
  } finally {
    URL.revokeObjectURL(url);
  }
}