import { cropImage, IMAGE_JPEG_QUALITY, type CroppedImage } from "./image-crop";

export const POSTER_WIDTH = 400;
export const POSTER_HEIGHT = 600;
export const POSTER_MAX_WIDTH = POSTER_WIDTH;
export const POSTER_JPEG_QUALITY = IMAGE_JPEG_QUALITY;
export const POSTER_HINT = "Rasio 2:3 (potret). Ideal 400x600 px. Format JPG/PNG/WebP, maks 5 MB. Gambar akan dipotong otomatis ke 2:3.";

export function resizedPosterDimensions(width: number, height: number) {
  const scale = Math.min(1, POSTER_MAX_WIDTH / width);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Center-crops to 2:3 portrait, 400x600 JPEG. */
export function cropPoster(file: File): Promise<CroppedImage> {
  return cropImage(file, POSTER_WIDTH, POSTER_HEIGHT);
}

export async function resizePoster(file: File): Promise<string> {
  return (await cropPoster(file)).dataUrl;
}
